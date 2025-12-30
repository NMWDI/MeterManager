from typing import List, Optional
from datetime import datetime, date
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
from api.models.main_models import (
    WellMeasurements,
    ObservedPropertyTypeLU,
    Units,
    Wells,
)
from api.session import get_db
from api.enums import ScopedUser
from google.cloud import storage

from pathlib import Path
from jinja2 import Environment, FileSystemLoader, select_autoescape
from zoneinfo import ZoneInfo

import zlib
import json
import os
import matplotlib

matplotlib.use("Agg")  # Force non-GUI backend

WOODPECKER_BUCKET_NAME = os.getenv("GCP_WOODPECKER_BUCKET_NAME", "")

TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"

templates = Environment(
    loader=FileSystemLoader(TEMPLATES_DIR),
    autoescape=select_autoescape(["html", "xml"]),
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
    "/waterlevels/woodpeckers",
    response_model=List[well_schemas.WellMeasurementDTO],
    tags=["WaterLevels"],
)
def read_woodpecker_waterlevels(
    well_id: int = Query(..., description="At least one well ID is required"),
):
    SP_JOHNSON_WELL_ID = 2599

    if well_id != SP_JOHNSON_WELL_ID:
        raise HTTPException(status_code=400, detail="Invalid well ID")

    DEPTH_TO_WATER_SENSOR_NAME = "Depth to Water"

    results: List[well_schemas.WellMeasurementDTO] = []
    seen_timestamps: set[str] = set()

    client = storage.Client()
    bucket = client.bucket(WOODPECKER_BUCKET_NAME)

    for blob in bucket.list_blobs():
        if not blob.name.endswith(".json"):
            continue

        content = blob.download_as_text()
        payload = json.loads(content)

        device_attributes = payload.get("deviceAttributes") or {}
        tz_name = device_attributes.get("timeZone") or "UTC"
        ra_number = device_attributes.get("wellId") or ""  # e.g. "RA-3502"

        sensor_data = payload.get("sensorData") or []
        depth_sensor = next(
            (
                s
                for s in sensor_data
                if (s.get("sensorName") or "").strip() == DEPTH_TO_WATER_SENSOR_NAME
            ),
            None,
        )
        if not depth_sensor:
            # No "Depth to Water" in this file; skip
            continue

        measurements = depth_sensor.get("measurements") or []
        for m in measurements:
            raw_ts = m.get("timestamp")
            if not raw_ts:
                continue

            ts = _parse_woodpecker_timestamp(raw_ts, tz_name)

            # Deduplicate by exact instant string (timezone-aware isoformat if tz parsed)
            ts_key = ts.isoformat()
            if ts_key in seen_timestamps:
                continue
            seen_timestamps.add(ts_key)

            raw_value = m.get("data")
            value = abs(raw_value) if raw_value is not None else None

            measurement_id = _make_measurement_id(well_id, ts, value)

            results.append(
                well_schemas.WellMeasurementDTO(
                    id=measurement_id,
                    timestamp=ts,
                    value=value,
                    submitting_user=well_schemas.WellMeasurementDTO.UserDTO(
                        full_name="Woodpeckers"
                    ),
                    well=well_schemas.WellMeasurementDTO.WellDTO(ra_number=ra_number),
                )
            )

    # Sort combined results across all files
    results.sort(key=lambda r: r.timestamp)
    return results


def _parse_woodpecker_timestamp(ts: str, tz_name: str) -> datetime:
    """
    Payload timestamp format: "DD/MM/YYYY HH:mm:ss"
    Example: "29/12/2025 00:20:40"
    """
    dt_naive = datetime.strptime(ts, "%d/%m/%Y %H:%M:%S")
    try:
        tz = ZoneInfo(tz_name)
    except Exception:
        # Fallback: keep naive if timezone is missing/invalid
        return dt_naive
    return dt_naive.replace(tzinfo=tz)


def _make_measurement_id(well_id: int, ts: datetime, value: Optional[float]) -> int:
    """
    Since the incoming format doesn't provide an integer measurement id,
    generate a deterministic-ish int id from well_id + timestamp + value.
    """
    key = f"{well_id}|{ts.isoformat()}|{value if value is not None else 'null'}"
    return zlib.crc32(key.encode("utf-8"))


@public_well_measurement_router.get(
    "/waterlevels",
    response_model=List[well_schemas.WellMeasurementDTO],
    tags=["WaterLevels"],
)
def read_waterlevels(
    well_ids: List[int] = Query(..., description="One or more well IDs"),
    from_date: Optional[date] = Query(
        None, description="Start date in ISO format, 'YYYY-MM-DD' (optional)"
    ),
    to_date: Optional[date] = Query(
        None, description="End date in ISO format, 'YYYY-MM-DD' (optional)"
    ),
    isAveragingAllWells: bool = Query(False),
    isComparingTo1970Average: bool = Query(False),
    comparisonYear: Optional[str] = Query(None, pattern=r"^$|^\d{4}$"),
    db: Session = Depends(get_db),
):
    """
    Return well measurements, optionally filtered by from_date/to_date,
    with optional averaging and historical comparison.
    """
    MONITORING_USE_TYPE_ID = 11
    synthetic_id_counter = -1

    def group_and_average(measurements, group_by_label: str):
        from collections import defaultdict

        grouped = defaultdict(list)
        for m in measurements:
            key = m.timestamp.strftime(
                "%Y-%m" if group_by_label == "month" else "%Y-%m-%d"
            )
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

    def get_measurements_by_ids(well_ids, start: Optional[date], end: Optional[date]):
        filters = [
            ObservedPropertyTypeLU.name == "Depth to water",
            WellMeasurements.well_id.in_(well_ids),
        ]
        if start:
            filters.append(WellMeasurements.timestamp >= start)
        if end:
            # include full day when end is provided
            end_dt = datetime.combine(end, datetime.max.time())
            filters.append(WellMeasurements.timestamp <= end_dt)

        stmt = (
            select(WellMeasurements)
            .options(
                joinedload(WellMeasurements.submitting_user),
                joinedload(WellMeasurements.well),
            )
            .join(ObservedPropertyTypeLU)
            .where(and_(*filters))
            .order_by(WellMeasurements.well_id, WellMeasurements.timestamp)
        )
        return db.scalars(stmt).all()

    # Decide grouping granularity only if both dates are given
    group_by = None
    if from_date and to_date:
        group_by = "month" if (to_date - from_date).days >= 365 else "day"

    if not well_ids and not isComparingTo1970Average and not comparisonYear:
        return []

    response_data: List[well_schemas.WellMeasurementDTO] = []

    # Averaged selection (if requested)
    if isAveragingAllWells and well_ids:
        current_measurements = get_measurements_by_ids(well_ids, from_date, to_date)
        averaged = group_and_average(current_measurements, group_by or "day")
        response_data.extend(averaged)

    # Raw per-well (if not averaging)
    if not isAveragingAllWells and well_ids:
        response_data.extend(get_measurements_by_ids(well_ids, from_date, to_date))

    # Helper: add a comparison average for any given year
    def add_year_average(year: int, label: str):
        # pick full year or same-month window depending on user’s range
        if from_date and to_date and (to_date - from_date).days >= 365:
            start = datetime(year, 1, 1)
            end = datetime(year, 12, 31, 23, 59, 59)
        else:
            # fallback: use provided month(s) if available, otherwise full year
            if from_date and to_date:
                start = datetime(year, from_date.month, 1)
                import calendar

                last_day = calendar.monthrange(year, to_date.month)[1]
                end = datetime(year, to_date.month, last_day, 23, 59, 59)
            else:
                start = datetime(year, 1, 1)
                end = datetime(year, 12, 31, 23, 59, 59)

        monitoring_ids = [
            row[0]
            for row in db.execute(
                select(Wells.id).where(Wells.use_type_id == MONITORING_USE_TYPE_ID)
            ).all()
        ]
        year_measurements = get_measurements_by_ids(monitoring_ids, start, end)
        averaged = group_and_average(year_measurements, "month")
        for dto in averaged:
            dto.well.ra_number = label
        response_data.extend(averaged)

    if isComparingTo1970Average:
        add_year_average(1970, "1970 Average")

    if comparisonYear:
        try:
            year_int = int(comparisonYear)
        except ValueError:
            raise HTTPException(
                status_code=400, detail="comparisonYear must be a 4-digit year"
            )

        current_year = datetime.now().year
        if year_int < 1900 or year_int > current_year:
            raise HTTPException(
                status_code=400,
                detail=f"comparisonYear must be between 1900 and {current_year}",
            )

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

        rows.append(
            {
                "timestamp": ts.strftime("%Y-%m-%d %H:%M"),
                "depth_to_water": val,
                "well_ra_number": ra,
            }
        )

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
            ax.plot(timestamps, values, label=ra_label, marker="o")
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
        headers={"Content-Disposition": "attachment; filename=waterlevels_report.pdf"},
    )


@authenticated_well_measurement_router.patch(
    "/waterlevels",
    dependencies=[Depends(ScopedUser.Admin)],
    response_model=well_schemas.WellMeasurement,
    tags=["WaterLevels"],
)
def patch_waterlevel(
    waterlevel_patch: well_schemas.PatchWaterLevel, db: Session = Depends(get_db)
):
    # Find the measurement
    well_measurement = db.scalars(
        select(WellMeasurements).where(
            WellMeasurements.id == waterlevel_patch.levelmeasurement_id
        )
    ).first()

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
    well_measurement = db.scalars(
        select(WellMeasurements).where(WellMeasurements.id == waterlevel_id)
    ).first()

    db.delete(well_measurement)
    db.commit()

    return True
