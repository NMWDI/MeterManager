from typing import List, Optional
from datetime import datetime, date
import calendar
import re

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

authenticated_well_measurement_router = APIRouter()
public_well_measurement_router = APIRouter()


@authenticated_well_measurement_router.post(
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


@public_well_measurement_router.get(
    "/waterlevels",
    response_model=List[well_schemas.WellMeasurementDTO],
    tags=["WaterLevels"],
)
def read_waterlevels(
    well_ids: List[int] = Query(..., description="One or more well IDs"),
    from_date: date = Query(..., description="Start date in ISO format, 'YYYY-MM-DD'"),
    to_date: date = Query(..., description="End date in ISO format, 'YYYY-MM-DD'"),
    isAveragingAllWells: bool = Query(False),
    isComparingTo1970Average: bool = Query(False),
    comparisonYear: Optional[str] = Query(None, pattern=r"^$|^\d{4}$"),
    db: Session = Depends(get_db),
):
    """
    Return well measurements between from_date and to_date, optionally
    averaging across wells and/or adding comparison-year averages.
    """
    MONITORING_USE_TYPE_ID = 11
    synthetic_id_counter = -1

    def group_and_average(measurements, group_by_label: str):
        from collections import defaultdict
        grouped = defaultdict(list)
        for m in measurements:
            key = m.timestamp.strftime("%Y-%m" if group_by_label == "month" else "%Y-%m-%d")
            grouped[key].append(m.value)

        result = []
        for time_str, values in sorted(grouped.items()):
            dt = datetime.strptime(
                time_str,
                "%Y-%m" if group_by_label == "month" else "%Y-%m-%d",
            )
            avg_value = sum(values) / len(values)
            nonlocal synthetic_id_counter
            result.append(
                well_schemas.WellMeasurementDTO(
                    id=synthetic_id_counter,
                    timestamp=dt,
                    value=avg_value,
                    submitting_user={"full_name": "System"},
                    well={"ra_number": "Average of wells"},
                )
            )
            synthetic_id_counter -= 1
        return result

    def get_measurements_by_ids(well_ids, start, end):
        stmt = (
            select(WellMeasurements)
            .options(joinedload(WellMeasurements.submitting_user),
                     joinedload(WellMeasurements.well))
            .join(ObservedPropertyTypeLU)
            .where(
                and_(
                    ObservedPropertyTypeLU.name == "Depth to water",
                    WellMeasurements.well_id.in_(well_ids),
                    WellMeasurements.timestamp >= start,
                    WellMeasurements.timestamp <= end,
                )
            )
            .order_by(WellMeasurements.well_id, WellMeasurements.timestamp)
        )
        return db.scalars(stmt).all()

    # Determine grouping granularity
    group_by = "month" if (to_date - from_date).days >= 365 else "day"

    if not well_ids and not isComparingTo1970Average and not comparisonYear:
        return []

    response_data: List[well_schemas.WellMeasurementDTO] = []

    # Averaged selection (if requested)
    if isAveragingAllWells and well_ids:
        current_measurements = get_measurements_by_ids(well_ids, from_date, to_date)
        averaged = group_and_average(current_measurements, group_by)
        response_data.extend(averaged)

    # Raw per-well (if not averaging)
    if not isAveragingAllWells and well_ids:
        response_data.extend(get_measurements_by_ids(well_ids, from_date, to_date))

    # Helper: add a comparison average for any given year (same rules as 1970)
    def add_year_average(year: int, label: str):
        if (to_date - from_date).days >= 365:
            start = datetime(year, 1, 1)
            end = datetime(year, 12, 31, 23, 59, 59)
        else:
            start = datetime(year, from_date.month, 1)
            last_day = calendar.monthrange(year, to_date.month)[1]
            end = datetime(year, to_date.month, last_day, 23, 59, 59)

        monitoring_ids = [
            row[0]
            for row in db.execute(
                select(Wells.id).where(Wells.use_type_id == MONITORING_USE_TYPE_ID)
            ).all()
        ]
        year_measurements = get_measurements_by_ids(monitoring_ids, start, end)
        averaged = group_and_average(year_measurements, "month")  # Always monthly for comparison
        for dto in averaged:
            dto.well.ra_number = label
        response_data.extend(averaged)

    # 1970 comparison (existing behavior)
    if isComparingTo1970Average:
        add_year_average(1970, "1970 Average")

    # Dynamic comparison year
    if comparisonYear:
        try:
            year_int = int(comparisonYear)
        except ValueError:
            raise HTTPException(status_code=400, detail="comparisonYear must be a 4-digit year")

        current_year = datetime.now().year
        if year_int < 1900 or year_int > current_year:
            raise HTTPException(status_code=400,
                                detail=f"comparisonYear must be between 1900 and {current_year}")

        # Avoid duplicate if user asked for 1970 both ways
        if not (isComparingTo1970Average and year_int == 1970):
            add_year_average(year_int, f"{year_int} Average")

    return response_data


@authenticated_well_measurement_router.get(
    "/waterlevels/pdf",
    dependencies=[Depends(ScopedUser.Read)],
    tags=["WaterLevels"],
)
def download_waterlevels_pdf(
    well_ids: List[int] = Query(..., description="One or more well IDs"),
    from_date: date = Query(..., description="Start date in ISO format, 'YYYY-MM-DD'"),
    to_date: date = Query(..., description="End date in ISO format, 'YYYY-MM-DD'"),
    isAveragingAllWells: bool = Query(False),
    isComparingTo1970Average: bool = Query(False),
    comparisonYear: Optional[str] = Query(None, pattern=r"^$|^\d{4}$"),
    db: Session = Depends(get_db),
):
    """
    Generate a PDF water-level report between two dates.
    Reuses the read_waterlevels() endpoint for data.
    """

    # Reuse the endpoint logic
    data = read_waterlevels(
        well_ids=well_ids,
        from_date=from_date,
        to_date=to_date,
        isAveragingAllWells=isAveragingAllWells,
        isComparingTo1970Average=isComparingTo1970Average,
        comparisonYear=comparisonYear,
        db=db,
    )

    if not data:
        raise HTTPException(status_code=404, detail="No water-level data found")

    from_year = from_date.year
    shift_years = set()
    if isComparingTo1970Average:
        shift_years.add(1970)
    if comparisonYear:
        try:
            shift_years.add(int(comparisonYear))
        except ValueError:
            pass  # already validated above

    def shift_year_safe(dt, new_year: int):
        """Shift dt to new_year, handling Feb 29 / month-end safely."""
        import calendar
        try:
            return dt.replace(year=new_year)
        except ValueError:
            last_day = calendar.monthrange(new_year, dt.month)[1]
            return dt.replace(year=new_year, day=min(dt.day, last_day))

    # Prepare rows for the table and points for the chart
    rows = []
    data_by_well = defaultdict(list)

    for m in data:
        # m is a WellMeasurementDTO from read_waterlevels
        ts = m.timestamp
        val = m.value
        ra = m.well["ra_number"] if isinstance(m.well, dict) else m.well.ra_number

        rows.append({
            "timestamp": ts.strftime("%Y-%m-%d %H:%M"),
            "depth_to_water": val,
            "well_ra_number": ra,
        })

        chart_ts = ts
        if from_year:
            m_match = re.match(r"^(\d{4}) Average$", ra)
            if m_match:
                yr = int(m_match.group(1))
                if yr in shift_years:
                    chart_ts = shift_year_safe(ts, from_year)

        data_by_well[ra].append((chart_ts, val))

    def make_line_chart(data: dict, title: str):
        if not data:
            return ""
        fig = figure(figsize=(10, 6))
        ax = fig.add_subplot(111)
        for ra_label, measurements in data.items():
            sorted_m = sorted(measurements, key=lambda x: x[0])
            timestamps = [ts for ts, _ in sorted_m]
            values = [val for _, val in sorted_m]
            ax.plot(timestamps, values, label=ra_label, marker='o')
        ax.set_title(title)
        ax.set_xlabel("Time")
        ax.set_ylabel("Depth to Water")
        ax.invert_yaxis()
        ax.legend()
        fig.autofmt_xdate()
        buf = BytesIO()
        fig.savefig(buf, format="png", bbox_inches="tight")
        close(fig)
        return b64encode(buf.getvalue()).decode("utf-8")

    chart_b64 = make_line_chart(data_by_well, "Depth of Water over Time")

    report_title = "ROSWELL ARTESIAN BASIN"
    report_subtext = None
    if isAveragingAllWells:
        num_wells = len(well_ids)
        well_word = "WELL" if num_wells == 1 else "WELLS"
        report_subtext = (
            f"MONTHLY AVERAGE WATER LEVEL WITHIN {num_wells} PVACD RECORDER {well_word}\n"
            "AVERAGES TAKEN FROM STEEL TAPE MEASUREMENTS MADE\n"
            "ON OR NEAR THE 5TH, 15TH AND 25TH OF EACH MONTH"
        )

    html = templates.get_template("waterlevels_report.html").render(
        from_date=from_date,
        to_date=to_date,
        observation_chart=chart_b64,
        rows=rows,
        report_title=report_title,
        report_subtext=report_subtext,
    )

    pdf_io = BytesIO()
    HTML(string=html).write_pdf(pdf_io)
    pdf_io.seek(0)

    return StreamingResponse(
        pdf_io,
        media_type="application/pdf",
        headers={
            "Content-Disposition": "attachment; filename=waterlevels_report.pdf"
        },
    )


@authenticated_well_measurement_router.patch(
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

@authenticated_well_measurement_router.delete(
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
