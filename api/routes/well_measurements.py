from typing import List, Optional
from datetime import datetime
import calendar

from fastapi import Depends, APIRouter, Query, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, and_

from weasyprint import HTML
from io import BytesIO
from collections import defaultdict
from matplotlib.pyplot import figure, close
from base64 import b64encode

from api.schemas import well_schemas
from api.models.main_models import WellMeasurements, ObservedPropertyTypeLU, Units, Wells
from api.session import get_db
from api.enums import ScopedUser

from pathlib import Path
from jinja2 import Environment, FileSystemLoader, select_autoescape

import matplotlib
matplotlib.use("Agg")  # Force non-GUI backend

TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"

templates = Environment(
    loader=FileSystemLoader(TEMPLATES_DIR),
    autoescape=select_autoescape(["html", "xml"])
)

well_measurement_router = APIRouter()


@well_measurement_router.post(
    "/waterlevels",
    dependencies=[Depends(ScopedUser.WellMeasurementWrite)],
    response_model=well_schemas.WellMeasurement,
    tags=["WaterLevels"],
)
def add_waterlevel(
    waterlevel: well_schemas.NewWaterLevelMeasurement, db: Session = Depends(get_db)
):
    # Create the well measurement from the form, qualify with units and property type
    well_measurement = WellMeasurements(
        timestamp=datetime.combine(
            waterlevel.timestamp.date(), waterlevel.timestamp.time()
        ),  # Convert to UTC
        value=waterlevel.value,
        observed_property_id=db.scalars(
            select(ObservedPropertyTypeLU.id).where(
                ObservedPropertyTypeLU.name == "Depth to water"
            )
        ).first(),
        submitting_user_id=waterlevel.submitting_user_id,
        unit_id=db.scalars(select(Units.id).where(Units.name == "feet")).first(),
        well_id=waterlevel.well_id,
    )

    db.add(well_measurement)
    db.commit()

    return well_measurement


@well_measurement_router.get(
    "/waterlevels",
    dependencies=[Depends(ScopedUser.Read)],
    response_model=List[well_schemas.WellMeasurementDTO],
    tags=["WaterLevels"],
)
def read_waterlevels(
    well_ids: List[int] = Query(..., description="One or more well IDs"),
    from_month: Optional[str] = Query(None, pattern=r"^\d{4}-\d{2}$"),
    to_month: Optional[str] = Query(None, pattern=r"^\d{4}-\d{2}$"),
    db: Session = Depends(get_db)
):
    if not well_ids:
        return []

    from_date = None
    to_date = None

    if from_month and to_month:
        try:
            from_date = datetime.strptime(from_month, "%Y-%m").replace(day=1)
            to_dt = datetime.strptime(to_month, "%Y-%m")
            year, month = to_dt.year, to_dt.month
            today = datetime.now()

            if year == today.year and month == today.month:
                to_date = today
            else:
                last_day = calendar.monthrange(year, month)[1]
                to_date = to_dt.replace(day=last_day, hour=23, minute=59, second=59)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Invalid date format. Use YYYY-MM."
            )

    stmt = (
        select(WellMeasurements)
        .options(joinedload(WellMeasurements.submitting_user))
        .join(ObservedPropertyTypeLU)
        .where(
            and_(
                ObservedPropertyTypeLU.name == "Depth to water",
                WellMeasurements.well_id.in_(well_ids),
                *( [WellMeasurements.timestamp >= from_date] if from_date else [] ),
                *( [WellMeasurements.timestamp <= to_date] if to_date else [] ),
            )
        )
        .order_by(WellMeasurements.well_id, WellMeasurements.timestamp)
    )

    results = db.scalars(stmt).all()

    return results


@well_measurement_router.get(
    "/waterlevels/pdf",
    dependencies=[Depends(ScopedUser.Read)],
    tags=["WaterLevels"],
)
def download_waterlevels_pdf(
    well_ids: List[int] = Query(..., description="One or more well IDs"),
    from_month: str = Query(..., pattern=r"^\d{4}-\d{2}$"),
    to_month: str = Query(..., pattern=r"^\d{4}-\d{2}$"),
    db: Session = Depends(get_db)
):
    if not well_ids:
        raise HTTPException(status_code=400, detail="well_ids is required")

    try:
        from_date = datetime.strptime(from_month, "%Y-%m").replace(day=1)
        to_dt = datetime.strptime(to_month, "%Y-%m")
        year, month = to_dt.year, to_dt.month
        today = datetime.now()
        if year == today.year and month == today.month:
            to_date = today
        else:
            last_day = calendar.monthrange(year, month)[1]
            to_date = to_dt.replace(day=last_day, hour=23, minute=59, second=59)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM.")

    stmt = (
        select(WellMeasurements)
        .options(joinedload(WellMeasurements.submitting_user))
        .join(ObservedPropertyTypeLU)
        .where(
            and_(
                ObservedPropertyTypeLU.name == "Depth to water",
                WellMeasurements.well_id.in_(well_ids),
                WellMeasurements.timestamp >= from_date,
                WellMeasurements.timestamp <= to_date,
            )
        )
        .order_by(WellMeasurements.well_id, WellMeasurements.timestamp)
    )

    results = db.scalars(stmt).all()

    # Prepare data for table
    rows = []
    data_by_well = defaultdict(list)
    for measurement in results:
        rows.append({
            "timestamp": measurement.timestamp.strftime("%Y-%m-%d %H:%M"),
            "depth_to_water": measurement.value,
            "well_ra_number": measurement.well.ra_number if measurement.well else "Unknown",
        })
        data_by_well[measurement.well_id].append((measurement.timestamp, measurement.value))

    # Generate line chart for Depth of Water over Time
    def make_line_chart(data: dict, title: str):
        if not data:
            return ""
        fig = figure(figsize=(10, 6))
        ax = fig.add_subplot(111)

        for well_id, measurements in data.items():
            sorted_measurements = sorted(measurements, key=lambda x: x[0])
            timestamps = [ts for ts, _ in sorted_measurements]
            values = [val for _, val in sorted_measurements]
            ax.plot(timestamps, values, label=f"Well {well_id}", marker='o')  # marker for data points

        ax.set_title(title)
        ax.set_xlabel("Time")
        ax.set_ylabel("Depth to Water")
        ax.legend()
        fig.autofmt_xdate()  # Format x-axis timestamps

        buf = BytesIO()
        fig.savefig(buf, format="png", bbox_inches="tight")
        close(fig)
        return b64encode(buf.getvalue()).decode("utf-8")

    line_chart_b64 = make_line_chart(data_by_well, "Depth of Water over Time")

    template = templates.get_template("waterlevels_report.html")
    html_content = template.render(
        from_month=from_month,
        to_month=to_month,
        observation_chart=line_chart_b64,
        rows=rows
    )

    pdf_io = BytesIO()
    HTML(string=html_content).write_pdf(pdf_io)
    pdf_io.seek(0)

    return StreamingResponse(
        pdf_io,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=waterlevels_report.pdf"},
    )


@well_measurement_router.patch(
    "/waterlevels",
    dependencies=[Depends(ScopedUser.Admin)],
    response_model=well_schemas.WellMeasurement,
    tags=["WaterLevels"],
)
def patch_waterlevel(waterlevel_patch: well_schemas.PatchWaterLevel, db: Session = Depends(get_db)):
    # Find the measurement
    well_measurement = (
        db.scalars(select(WellMeasurements).where(WellMeasurements.id == waterlevel_patch.levelmeasurement_id)).first()
    )

    # Update the fields, all are mandatory
    well_measurement.submitting_user_id = waterlevel_patch.submitting_user_id
    well_measurement.timestamp = waterlevel_patch.timestamp
    well_measurement.value = waterlevel_patch.value

    db.commit()

    return well_measurement

@well_measurement_router.delete(
    "/waterlevels",
    dependencies=[Depends(ScopedUser.Admin)],
    tags=["WaterLevels"],
)
def delete_waterlevel(waterlevel_id: int, db: Session = Depends(get_db)):
    # Find the measurement
    well_measurement = (
        db.scalars(select(WellMeasurements).where(WellMeasurements.id == waterlevel_id)).first()
    )

    db.delete(well_measurement)
    db.commit()

    return True


# ----------------- Chloride Concentration ----------------- #


@well_measurement_router.get(
    "/chlorides",
    dependencies=[Depends(ScopedUser.Read)],
    response_model=List[well_schemas.WellMeasurementDTO],
    tags=["Chlorides"],
)
def read_chlorides(
    chloride_group_id: int = Query(..., description="Chloride group ID to filter by"),
    db: Session = Depends(get_db)
):
    chloride_concentration_group_id = 5

    return db.scalars(
        select(WellMeasurements)
        .options(
            joinedload(WellMeasurements.submitting_user),
            joinedload(WellMeasurements.well)
        )
        .join(Wells, Wells.id == WellMeasurements.well_id)
        .where(
            and_(
                WellMeasurements.observed_property_id == chloride_concentration_group_id,
                Wells.chloride_group_id == chloride_group_id
            )
        )
    ).all()


@well_measurement_router.post(
    "/chlorides",
    dependencies=[Depends(ScopedUser.WellMeasurementWrite)],
    response_model=well_schemas.ChlorideMeasurement,
    tags=["Chlorides"],
)
def add_chloride_measurement(
    chloride_measurement: well_schemas.WellMeasurement,
    db: Session = Depends(get_db),
):
    # Create a new chloride measurement as a WellMeasurement
    well_measurement = WellMeasurements(
        timestamp = chloride_measurement.timestamp,
        value = chloride_measurement.value,
        observed_property_id = 5,  # Chloride Concentration
        submitting_user_id = chloride_measurement.submitting_user_id,
        unit_id = chloride_measurement.unit_id,
        well_id = chloride_measurement.well_id
    )

    db.add(well_measurement)
    db.commit()

    return well_measurement

@well_measurement_router.patch(
    "/chlorides",
    dependencies=[Depends(ScopedUser.WellMeasurementWrite)],
    response_model=well_schemas.WellMeasurement,
    tags=["Chlorides"],
)
def patch_chloride_measurement(
    chloride_measurement_patch: well_schemas.PatchChlorideMeasurement,
    db: Session = Depends(get_db),
):
    # Find the measurement
    well_measurement = (
        db.scalars(select(WellMeasurements).where(WellMeasurements.id == chloride_measurement_patch.id)).first()
    )

    # Update the fields, all are mandatory
    well_measurement.submitting_user_id = chloride_measurement_patch.submitting_user_id
    well_measurement.timestamp = chloride_measurement_patch.timestamp
    well_measurement.value = chloride_measurement_patch.value
    well_measurement.unit_id = chloride_measurement_patch.unit_id
    well_measurement.well_id = chloride_measurement_patch.well_id

    db.commit()

    return well_measurement

@well_measurement_router.delete(
    "/chlorides",
    dependencies=[Depends(ScopedUser.Admin)],
    tags=["Chlorides"],
)
def delete_chloride_measurement(chloride_measurement_id: int, db: Session = Depends(get_db)):
    # Find the measurement
    well_measurement = (
        db.scalars(select(WellMeasurements).where(WellMeasurements.id == chloride_measurement_id)).first()
    )

    db.delete(well_measurement)
    db.commit()

    return True



