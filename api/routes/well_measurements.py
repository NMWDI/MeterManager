from typing import List, Optional
from datetime import datetime
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
    from_month: Optional[str] = Query(None, pattern=r"^$|^\d{4}-\d{2}$"),
    to_month: Optional[str] = Query(None, pattern=r"^$|^\d{4}-\d{2}$"),
    isAveragingAllWells: bool = Query(False),
    isComparingTo1970Average: bool = Query(False),
    comparisonYear: Optional[str] = Query(None, pattern=r"^$|^\d{4}$"),
    db: Session = Depends(get_db),
):
    MONITORING_USE_TYPE_ID = 11
    synthetic_id_counter = -1

    def group_and_average(measurements, group_by_label: str):
        grouped = defaultdict(list)
        for m in measurements:
            key = m.timestamp.strftime("%Y-%m" if group_by_label == "month" else "%Y-%m-%d")
            grouped[key].append(m.value)

        result = []
        for time_str, values in sorted(grouped.items()):
            dt = datetime.strptime(time_str, "%Y-%m" if group_by_label == "month" else "%Y-%m-%d")
            avg_value = sum(values) / len(values)
            nonlocal synthetic_id_counter
            result.append(well_schemas.WellMeasurementDTO(
                id=synthetic_id_counter,
                timestamp=dt,
                value=avg_value,
                submitting_user={"full_name": "System"},
                well={"ra_number": "Average of wells"}
            ))
            synthetic_id_counter -= 1
        return result

    def get_measurements_by_ids(well_ids, start, end):
        stmt = (
            select(WellMeasurements)
            .options(joinedload(WellMeasurements.submitting_user), joinedload(WellMeasurements.well))
            .join(ObservedPropertyTypeLU)
            .where(
                and_(
                    ObservedPropertyTypeLU.name == "Depth to water",
                    WellMeasurements.well_id.in_(well_ids),
                    *( [WellMeasurements.timestamp >= start] if start else [] ),
                    *( [WellMeasurements.timestamp <= end] if end else [] ),
                )
            )
            .order_by(WellMeasurements.well_id, WellMeasurements.timestamp)
        )
        return db.scalars(stmt).all()

    # Helper: add a comparison average for any given year (same rules as 1970)
    def add_year_average(year: int, label: str):
        # Determine comparison window shape based on requested range size
        if (to_date - from_date).days >= 365:
            start = datetime(year, 1, 1)
            end = datetime(year, 12, 31, 23, 59, 59)
        else:
            start = datetime(year, from_date.month, 1)
            last_day = calendar.monthrange(year, to_date.month)[1]
            end = datetime(year, to_date.month, last_day, 23, 59, 59)

        monitoring_ids = [
            row[0] for row in db.execute(
                select(Wells.id).where(Wells.use_type_id == MONITORING_USE_TYPE_ID)
            ).all()
        ]
        year_measurements = get_measurements_by_ids(monitoring_ids, start, end)
        averaged = group_and_average(year_measurements, "month")  # Always by month
        for dto in averaged:
            dto.well.ra_number = label
        response_data.extend(averaged)

    # Parse dates
    from_date, to_date = None, None
    if from_month and to_month:
        try:
            from_date = datetime.strptime(from_month, "%Y-%m").replace(day=1)
            to_dt = datetime.strptime(to_month, "%Y-%m")
            today = datetime.now()
            if to_dt.year == today.year and to_dt.month == today.month:
                to_date = today
            else:
                last_day = calendar.monthrange(to_dt.year, to_dt.month)[1]
                to_date = to_dt.replace(day=last_day, hour=23, minute=59, second=59)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM.")

    if not well_ids and not isComparingTo1970Average and not comparisonYear:
        return []

    group_by = None
    if from_month and to_month:
        group_by = "month" if (to_date - from_date).days >= 365 else "day"

    response_data = []

    # Averaged selection (if requested)
    if isAveragingAllWells and well_ids:
        current_measurements = get_measurements_by_ids(well_ids, from_date, to_date)
        averaged = group_and_average(current_measurements, group_by)
        response_data.extend(averaged)

    # Raw per-well (if not averaging)
    if not isAveragingAllWells and well_ids:
        response_data.extend(get_measurements_by_ids(well_ids, from_date, to_date))

    # 1970 comparison (existing behavior)
    if isComparingTo1970Average:
        add_year_average(1970, "1970 Average")

    # Dynamic comparison year (NEW)
    if comparisonYear:
        try:
            year_int = int(comparisonYear)
        except ValueError:
            raise HTTPException(status_code=400, detail="comparisonYear must be a 4-digit year")

        current_year = datetime.now().year
        if year_int < 1900 or year_int > current_year:
            raise HTTPException(status_code=400, detail=f"comparisonYear must be between 1900 and {current_year}")

        # Avoid duplicate if user asked for 1970 both ways
        already_added_1970 = isComparingTo1970Average and year_int == 1970
        if not already_added_1970:
            add_year_average(year_int, f"{year_int} Average")

    return response_data


@well_measurement_router.get(
    "/waterlevels/pdf",
    dependencies=[Depends(ScopedUser.Read)],
    tags=["WaterLevels"],
)
def download_waterlevels_pdf(
    well_ids: List[int] = Query(..., description="One or more well IDs"),
    from_month: str = Query(..., pattern=r"^\d{4}-\d{2}$"),
    to_month: str = Query(..., pattern=r"^\d{4}-\d{2}$"),
    isAveragingAllWells: bool = Query(False),
    isComparingTo1970Average: bool = Query(False),
    comparisonYear: Optional[str] = Query(None, pattern=r"^$|^\d{4}$"),
    db: Session = Depends(get_db),
):
    MONITORING_USE_TYPE_ID = 11
    synthetic_id_counter = -1

    def group_and_average(measurements, group_by_label: str, ra_label: str):
        from collections import defaultdict
        grouped = defaultdict(list)
        for m in measurements:
            key = m.timestamp.strftime("%Y-%m" if group_by_label == "month" else "%Y-%m-%d")
            grouped[key].append(m.value)

        result = []
        for time_str, values in sorted(grouped.items()):
            dt = datetime.strptime(time_str, "%Y-%m" if group_by_label == "month" else "%Y-%m-%d")
            avg_value = sum(values) / len(values)
            nonlocal synthetic_id_counter
            result.append({
                "id": synthetic_id_counter,
                "timestamp": dt,
                "value": avg_value,
                "well_ra_number": ra_label,
            })
            synthetic_id_counter -= 1
        return result

    def get_measurements_by_ids(well_ids, start, end):
        stmt = (
            select(WellMeasurements)
            .options(joinedload(WellMeasurements.submitting_user), joinedload(WellMeasurements.well))
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

    # Parse dates
    try:
        from_date = datetime.strptime(from_month, "%Y-%m").replace(day=1)
        to_dt = datetime.strptime(to_month, "%Y-%m")
        today = datetime.now()
        if to_dt.year == today.year and to_dt.month == today.month:
            to_date = today
        else:
            last_day = calendar.monthrange(to_dt.year, to_dt.month)[1]
            to_date = to_dt.replace(day=last_day, hour=23, minute=59, second=59)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM.")

    # treat "" as not provided
    comparisonYear = comparisonYear or None

    if not well_ids and not isComparingTo1970Average and not comparisonYear:
        raise HTTPException(status_code=400, detail="well_ids is required")

    group_by = "month" if (to_date - from_date).days >= 365 else "day"
    results = []

    # Averaging for selected wells
    if isAveragingAllWells and well_ids:
        current_measurements = get_measurements_by_ids(well_ids, from_date, to_date)
        results.extend(group_and_average(current_measurements, group_by, "Average of wells"))

    # Raw per-well data
    if not isAveragingAllWells and well_ids:
        raw = get_measurements_by_ids(well_ids, from_date, to_date)
        for m in raw:
            results.append({
                "id": m.id,
                "timestamp": m.timestamp,
                "value": m.value,
                "well_ra_number": m.well.ra_number if m.well else "Unknown"
            })

    # Helper: add comparison average for any given year (same window rules as 1970)
    def add_year_average(year: int, label: str):
        if (to_date - from_date).days >= 365:
            start = datetime(year, 1, 1)
            end = datetime(year, 12, 31, 23, 59, 59)
        else:
            start = datetime(year, from_date.month, 1)
            last_day = calendar.monthrange(year, to_date.month)[1]
            end = datetime(year, to_date.month, last_day, 23, 59, 59)

        monitoring_ids = [row[0] for row in db.execute(
            select(Wells.id).where(Wells.use_type_id == MONITORING_USE_TYPE_ID)
        ).all()]
        year_measurements = get_measurements_by_ids(monitoring_ids, start, end)
        averaged = group_and_average(year_measurements, "month", label)  # Always monthly for comparison
        results.extend(averaged)

    # 1970 Comparison
    if isComparingTo1970Average:
        add_year_average(1970, "1970 Average")

    # Dynamic comparison year
    if comparisonYear:
        try:
            year_int = int(comparisonYear)
        except ValueError:
            raise HTTPException(status_code=400, detail="comparisonYear must be a 4-digit year")
        now_year = datetime.now().year
        if year_int < 1900 or year_int > now_year:
            raise HTTPException(status_code=400, detail=f"comparisonYear must be between 1900 and {now_year}")

        # avoid duplicate series if user chose 1970 in both mechanisms
        if not (isComparingTo1970Average and year_int == 1970):
            add_year_average(year_int, f"{year_int} Average")

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

    from_year = from_date.year if from_date else None

    def shift_year_safe(dt, new_year: int):
        """Shift dt to new_year, handling Feb 29 / month-end safely."""
        try:
            return dt.replace(year=new_year)
        except ValueError:
            last_day = calendar.monthrange(new_year, dt.month)[1]
            return dt.replace(year=new_year, day=min(dt.day, last_day))

    # Prepare data for table + chart (apply timeshift to comparison series)
    rows = []
    data_by_well = defaultdict(list)

    # Precompute which series should be shifted (e.g., "1970 Average", "2021 Average")
    shift_years = set()
    if isComparingTo1970Average:
        shift_years.add(1970)
    if comparisonYear:
        try:
            shift_years.add(int(comparisonYear))
        except ValueError:
            pass  # already validated above; safe guard

    for record in results:
        original_ts = record["timestamp"]
        value = record["value"]
        well_label = record["well_ra_number"]

        # Table rows keep original timestamp
        rows.append({
            "timestamp": original_ts.strftime("%Y-%m-%d %H:%M"),
            "depth_to_water": value,
            "well_ra_number": well_label,
        })

        chart_ts = original_ts
        # Detect labels like "1970 Average" or "2021 Average" and shift to from_year
        if from_year:
            m = re.match(r"^(\d{4}) Average$", well_label)
            if m:
                yr = int(m.group(1))
                if yr in shift_years:
                    chart_ts = shift_year_safe(original_ts, from_year)

        data_by_well[well_label].append((chart_ts, value))

    def make_line_chart(data: dict, title: str):
        if not data:
            return ""
        fig = figure(figsize=(10, 6))
        ax = fig.add_subplot(111)
        for ra, measurements in data.items():
            sorted_measurements = sorted(measurements, key=lambda x: x[0])
            timestamps = [ts for ts, _ in sorted_measurements]
            values = [val for _, val in sorted_measurements]
            ax.plot(timestamps, values, label=ra, marker='o')
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
    html = templates.get_template("waterlevels_report.html").render(
        from_month=from_month,
        to_month=to_month,
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



