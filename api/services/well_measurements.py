from base64 import b64encode
from collections import defaultdict
from datetime import date, datetime
from io import BytesIO
from pathlib import Path
from typing import Any, Dict, Optional
from zoneinfo import ZoneInfo
import calendar
import json
import os
import re
import zlib

import matplotlib
from google.cloud import storage
from jinja2 import Environment, FileSystemLoader, select_autoescape
from matplotlib.pyplot import close, figure
from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session, joinedload
from weasyprint import HTML

from api.models.meter import ObservedPropertyTypeLU
from api.models.well import WellMeasurements, Wells
from api.schemas import well


matplotlib.use("Agg")

WOODPECKER_BUCKET_NAME = os.getenv("GCP_WOODPECKER_BUCKET_NAME", "")
TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"

templates = Environment(
    loader=FileSystemLoader(TEMPLATES_DIR),
    autoescape=select_autoescape(["html", "xml"]),
)

SP_JOHNSON_WELL_ID = 2599
DEPTH_TO_WATER_SENSOR_NAME = "Depth to Water"
MONITORING_USE_TYPE_ID = 11


def read_woodpecker_waterlevels(
    well_id: int,
) -> list[well.WellMeasurementDTO]:
    if well_id != SP_JOHNSON_WELL_ID:
        raise ValueError("Invalid well ID")

    results: list[well.WellMeasurementDTO] = []
    seen_timestamps: set[str] = set()

    client = storage.Client()
    bucket = client.bucket(WOODPECKER_BUCKET_NAME)

    for blob in bucket.list_blobs():
        if not blob.name.endswith(".json"):
            continue

        payload = json.loads(blob.download_as_text())
        device_attributes = payload.get("deviceAttributes") or {}
        tz_name = device_attributes.get("timeZone") or "UTC"
        ra_number = device_attributes.get("wellId") or ""

        sensor_data = payload.get("sensorData") or []
        depth_sensor = next(
            (
                sensor
                for sensor in sensor_data
                if (sensor.get("sensorName") or "").strip() == DEPTH_TO_WATER_SENSOR_NAME
            ),
            None,
        )
        if not depth_sensor:
            continue

        for measurement in depth_sensor.get("measurements") or []:
            raw_ts = measurement.get("timestamp")
            if not raw_ts:
                continue

            ts = _parse_woodpecker_timestamp(raw_ts, tz_name)
            ts_key = ts.isoformat()
            if ts_key in seen_timestamps:
                continue
            seen_timestamps.add(ts_key)

            raw_value = measurement.get("data")
            value = abs(raw_value) if raw_value is not None else None

            results.append(
                well.WellMeasurementDTO(
                    id=_make_measurement_id(well_id, ts, value),
                    timestamp=ts,
                    value=value,
                    submitting_user=well.WellMeasurementDTO.UserDTO(
                        full_name="Woodpeckers"
                    ),
                    well=well.WellMeasurementDTO.WellDTO(ra_number=ra_number),
                )
            )

    results.sort(key=lambda item: item.timestamp)
    return results


def _parse_woodpecker_timestamp(ts: str, tz_name: str) -> datetime:
    dt_naive = datetime.strptime(ts, "%d/%m/%Y %H:%M:%S")
    try:
        tz = ZoneInfo(tz_name)
    except Exception:
        return dt_naive
    return dt_naive.replace(tzinfo=tz)


def _make_measurement_id(well_id: int, ts: datetime, value: Optional[float]) -> int:
    key = f"{well_id}|{ts.isoformat()}|{value if value is not None else 'null'}"
    return zlib.crc32(key.encode("utf-8"))


def _group_and_average(
    measurements: list[well.WellMeasurementDTO],
    group_by_label: str,
    ra_number: str,
    synthetic_id_counter: int,
) -> tuple[list[well.WellMeasurementDTO], int]:
    grouped: dict[str, list[float]] = defaultdict(list)
    for measurement in measurements:
        key = measurement.timestamp.strftime(
            "%Y-%m" if group_by_label == "month" else "%Y-%m-%d"
        )
        grouped[key].append(measurement.value)

    results: list[well.WellMeasurementDTO] = []
    for time_str, values in sorted(grouped.items()):
        dt = datetime.strptime(
            time_str,
            "%Y-%m" if group_by_label == "month" else "%Y-%m-%d",
        )
        results.append(
            well.WellMeasurementDTO(
                id=synthetic_id_counter,
                timestamp=dt,
                value=sum(values) / len(values),
                submitting_user={"full_name": "System"},
                well={"ra_number": ra_number},
            )
        )
        synthetic_id_counter -= 1

    return results, synthetic_id_counter


def _get_measurements_by_ids(
    db: Session,
    well_ids: list[int],
    start: Optional[date],
    end: Optional[date],
):
    filters = [
        ObservedPropertyTypeLU.name == "Depth to water",
        WellMeasurements.well_id.in_(well_ids),
    ]
    if start:
        filters.append(WellMeasurements.timestamp >= start)
    if end:
        filters.append(WellMeasurements.timestamp <= datetime.combine(end, datetime.max.time()))

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


def read_waterlevels(
    *,
    db: Session,
    well_ids: list[int],
    from_date: Optional[date],
    to_date: Optional[date],
    is_averaging_all_wells: bool,
    is_comparing_to_1970_average: bool,
    comparison_year: Optional[str],
) -> list[well.WellMeasurementDTO]:
    synthetic_id_counter = -1

    group_by = None
    if from_date and to_date:
        group_by = "month" if (to_date - from_date).days >= 365 else "day"

    if not well_ids and not is_comparing_to_1970_average and not comparison_year:
        return []

    response_data: list[well.WellMeasurementDTO] = []

    if is_averaging_all_wells and well_ids:
        current_measurements = _get_measurements_by_ids(db, well_ids, from_date, to_date)
        averaged, synthetic_id_counter = _group_and_average(
            current_measurements,
            group_by or "day",
            "Average of wells",
            synthetic_id_counter,
        )
        response_data.extend(averaged)

    if not is_averaging_all_wells and well_ids:
        response_data.extend(_get_measurements_by_ids(db, well_ids, from_date, to_date))

    def add_year_average(year: int, label: str):
        nonlocal synthetic_id_counter
        if from_date and to_date and (to_date - from_date).days >= 365:
            start = date(year, 1, 1)
            end = date(year, 12, 31)
        elif from_date and to_date:
            start = date(year, from_date.month, 1)
            end = date(year, to_date.month, calendar.monthrange(year, to_date.month)[1])
        else:
            start = date(year, 1, 1)
            end = date(year, 12, 31)

        monitoring_ids = [
            row[0]
            for row in db.execute(
                select(Wells.id).where(Wells.use_type_id == MONITORING_USE_TYPE_ID)
            ).all()
        ]
        year_measurements = _get_measurements_by_ids(db, monitoring_ids, start, end)
        averaged, synthetic_id_counter = _group_and_average(
            year_measurements,
            "month",
            label,
            synthetic_id_counter,
        )
        response_data.extend(averaged)

    if is_comparing_to_1970_average:
        add_year_average(1970, "1970 Average")

    if comparison_year:
        try:
            year_int = int(comparison_year)
        except ValueError:
            raise ValueError("comparisonYear must be a 4-digit year")

        current_year = datetime.now().year
        if year_int < 1900 or year_int > current_year:
            raise ValueError(f"comparisonYear must be between 1900 and {current_year}")

        if not (is_comparing_to_1970_average and year_int == 1970):
            add_year_average(year_int, f"{year_int} Average")

    return response_data


def get_waterlevel_report_averages(
    *,
    well_ids: list[int],
    from_date: Optional[date],
    to_date: Optional[date],
    db: Session,
) -> Dict[str, Any]:
    if not well_ids:
        return {"bucket": None, "per_well": [], "all_wells": []}

    if from_date is None and to_date is None:
        return {"bucket": None, "per_well": [], "all_wells": []}

    start_dt = datetime.combine(from_date, datetime.min.time()) if from_date else None
    end_dt = datetime.combine(to_date, datetime.max.time()) if to_date else None

    if from_date and to_date:
        bucket_unit = "year" if (to_date - from_date).days >= 365 else "month"
    else:
        bucket_unit = "month"

    bucket = func.date_trunc(bucket_unit, WellMeasurements.timestamp).label("period_start")
    base_filters = [
        ObservedPropertyTypeLU.name == "Depth to water",
        WellMeasurements.well_id.in_(well_ids),
    ]
    if start_dt:
        base_filters.append(WellMeasurements.timestamp >= start_dt)
    if end_dt:
        base_filters.append(WellMeasurements.timestamp <= end_dt)

    per_well_stmt = (
        select(
            WellMeasurements.well_id.label("well_id"),
            Wells.ra_number.label("ra_number"),
            bucket,
            func.avg(WellMeasurements.value).label("avg_value"),
        )
        .join(Wells, Wells.id == WellMeasurements.well_id)
        .join(
            ObservedPropertyTypeLU,
            ObservedPropertyTypeLU.id == WellMeasurements.observed_property_id,
        )
        .where(and_(*base_filters))
        .group_by(WellMeasurements.well_id, Wells.ra_number, bucket)
        .order_by(Wells.ra_number, bucket)
    )

    all_wells_stmt = (
        select(bucket, func.avg(WellMeasurements.value).label("avg_value"))
        .join(
            ObservedPropertyTypeLU,
            ObservedPropertyTypeLU.id == WellMeasurements.observed_property_id,
        )
        .where(and_(*base_filters))
        .group_by(bucket)
        .order_by(bucket)
    )

    return {
        "bucket": bucket_unit,
        "per_well": [
            {
                "well_id": row.well_id,
                "ra_number": row.ra_number,
                "period_start": row.period_start,
                "avg_value": float(row.avg_value) if row.avg_value is not None else None,
            }
            for row in db.execute(per_well_stmt).all()
        ],
        "all_wells": [
            {
                "period_start": row.period_start,
                "avg_value": float(row.avg_value) if row.avg_value is not None else None,
            }
            for row in db.execute(all_wells_stmt).all()
        ],
    }


def build_waterlevels_pdf(
    *,
    db: Session,
    well_ids: list[int],
    from_date: date,
    to_date: date,
    is_averaging_all_wells: bool,
    is_comparing_to_1970_average: bool,
    comparison_year: Optional[str],
) -> BytesIO:
    data = read_waterlevels(
        db=db,
        well_ids=well_ids,
        from_date=from_date,
        to_date=to_date,
        is_averaging_all_wells=is_averaging_all_wells,
        is_comparing_to_1970_average=is_comparing_to_1970_average,
        comparison_year=comparison_year,
    )
    if not data:
        raise LookupError("No water-level data found")

    from_year = from_date.year
    shift_years = set()
    if is_comparing_to_1970_average:
        shift_years.add(1970)
    if comparison_year:
        try:
            shift_years.add(int(comparison_year))
        except ValueError:
            pass

    rows = []
    data_by_well = defaultdict(list)
    for measurement in data:
        ts = measurement.timestamp
        value = measurement.value
        ra_number = (
            measurement.well["ra_number"]
            if isinstance(measurement.well, dict)
            else measurement.well.ra_number
        )

        rows.append(
            {
                "timestamp": ts.strftime("%Y-%m-%d %H:%M"),
                "depth_to_water": value,
                "well_ra_number": ra_number,
            }
        )

        chart_ts = ts
        if from_year:
            match = re.match(r"^(\d{4}) Average$", ra_number)
            if match:
                year = int(match.group(1))
                if year in shift_years:
                    chart_ts = _shift_year_safe(ts, from_year)

        data_by_well[ra_number].append((chart_ts, value))

    chart_b64 = _make_line_chart(data_by_well, "Depth of Water over Time")
    report_subtext = None
    if is_averaging_all_wells:
        num_wells = len(well_ids)
        well_word = "WELL" if num_wells == 1 else "WELLS"
        report_subtext = (
            f"MONTHLY AVERAGE WATER LEVEL WITHIN {num_wells} PVACD RECORDER {well_word}\n"
            "AVERAGES TAKEN FROM STEEL TAPE MEASUREMENTS MADE\n"
            "ON OR NEAR THE 5TH, 15TH AND 25TH OF EACH MONTH"
        )

    averages = get_waterlevel_report_averages(
        well_ids=well_ids,
        from_date=from_date,
        to_date=to_date,
        db=db,
    )
    html = templates.get_template("waterlevels_report.html").render(
        from_date=from_date,
        to_date=to_date,
        observation_chart=chart_b64,
        rows=rows,
        report_title="ROSWELL ARTESIAN BASIN",
        report_subtext=report_subtext,
        averages=averages,
    )

    pdf_io = BytesIO()
    HTML(string=html).write_pdf(pdf_io)
    pdf_io.seek(0)
    return pdf_io


def _shift_year_safe(dt: datetime, new_year: int):
    try:
        return dt.replace(year=new_year)
    except ValueError:
        last_day = calendar.monthrange(new_year, dt.month)[1]
        return dt.replace(year=new_year, day=min(dt.day, last_day))


def _make_line_chart(data: dict, title: str):
    if not data:
        return ""
    fig = figure(figsize=(10, 6))
    ax = fig.add_subplot(111)
    for ra_label, measurements in data.items():
        sorted_measurements = sorted(measurements, key=lambda item: item[0])
        timestamps = [ts for ts, _ in sorted_measurements]
        values = [val for _, val in sorted_measurements]
        ax.plot(timestamps, values, label=ra_label, marker="o")
    ax.set_title(title)
    ax.set_xlabel("Time")
    ax.set_ylabel("Depth to Water")
    ax.invert_yaxis()
    fig.subplots_adjust(right=0.78)
    ax.legend(
        loc="center left",
        bbox_to_anchor=(1.02, 0.5),
        borderaxespad=0.0,
        frameon=True,
    )
    fig.autofmt_xdate()
    buf = BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight")
    close(fig)
    return b64encode(buf.getvalue()).decode("utf-8")
