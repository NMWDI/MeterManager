from enum import Enum
from datetime import date, datetime
from io import BytesIO
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload
from weasyprint import HTML

from api.models.meter import (
    ActivityTypeLU,
    MeterActivities,
    MeterObservations,
    Meters,
    MeterTypeLU,
)
from api.models.part import Parts, PartsUsed
from api.models.well import Wells
from api.services.storage import create_signed_url


TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"
templates = Environment(
    loader=FileSystemLoader(TEMPLATES_DIR),
    autoescape=select_autoescape(["html", "xml"]),
)


class HistoryType(Enum):
    Activity = "Activity"
    Observation = "Observation"
    LocationChange = "LocationChange"


def get_meter_history(db: Session, meter_id: int):
    activities = (
        db.scalars(
            select(MeterActivities)
            .options(
                joinedload(MeterActivities.location),
                joinedload(MeterActivities.submitting_user),
                joinedload(MeterActivities.activity_type),
                joinedload(MeterActivities.parts_used_links)
                .joinedload(PartsUsed.part)
                .joinedload(Parts.part_type),
                joinedload(MeterActivities.notes),
                joinedload(MeterActivities.services_performed),
            )
            .filter(MeterActivities.meter_id == meter_id)
        )
        .unique()
        .all()
    )

    observations = db.scalars(
        select(MeterObservations)
        .options(
            joinedload(MeterObservations.submitting_user),
            joinedload(MeterObservations.observed_property),
            joinedload(MeterObservations.unit),
            joinedload(MeterObservations.location),
        )
        .filter(MeterObservations.meter_id == meter_id)
    ).all()

    formatted_history_items = []
    item_id = 0

    for activity in activities:
        activity.location.geom = None
        activity_well = db.scalars(
            select(Wells).where(Wells.location_id == activity.location_id)
        ).first()
        photos = [
            {
                "id": photo.id,
                "file_name": photo.file_name,
                "url": create_signed_url(photo.gcs_path),
                "uploaded_at": photo.uploaded_at,
            }
            for photo in activity.photos
        ]
        formatted_history_items.append(
            {
                "id": item_id,
                "history_type": HistoryType.Activity,
                "well": activity_well,
                "location": activity.location,
                "activity_type": activity.activity_type_id,
                "date": activity.timestamp_start,
                "history_item": activity,
                "photos": photos,
            }
        )
        item_id += 1

    for observation in observations:
        observation.location.geom = None
        observation_well = db.scalars(
            select(Wells).where(Wells.location_id == observation.location_id)
        ).first()
        formatted_history_items.append(
            {
                "id": item_id,
                "history_type": HistoryType.Observation,
                "well": observation_well,
                "location": observation.location,
                "date": observation.timestamp,
                "history_item": observation,
            }
        )
        item_id += 1

    formatted_history_items.sort(key=lambda item: item["date"], reverse=True)
    return formatted_history_items


def _meter_type_label(meter_type: MeterTypeLU) -> str:
    return " ".join(
        filter(
            None,
            [
                meter_type.brand,
                meter_type.series,
                meter_type.model,
                f'{meter_type.size:g}"',
            ],
        )
    )


def get_sold_meters_report(
    db: Session,
    from_date: date,
    to_date: date,
    min_size: int | None = None,
    max_size: int | None = None,
):
    start_dt = datetime.combine(from_date, datetime.min.time())
    end_dt = datetime.combine(to_date, datetime.max.time())

    stmt = (
        select(MeterActivities, Meters, MeterTypeLU)
        .join(ActivityTypeLU, ActivityTypeLU.id == MeterActivities.activity_type_id)
        .join(Meters, Meters.id == MeterActivities.meter_id)
        .join(MeterTypeLU, MeterTypeLU.id == Meters.meter_type_id)
        .where(
            ActivityTypeLU.name == "Sell",
            MeterActivities.timestamp_start >= start_dt,
            MeterActivities.timestamp_start <= end_dt,
        )
        .order_by(MeterActivities.timestamp_start.asc(), Meters.serial_number.asc())
    )

    if min_size is not None:
        stmt = stmt.where(MeterTypeLU.size >= min_size)
    if max_size is not None:
        stmt = stmt.where(MeterTypeLU.size <= max_size)

    rows = []
    type_totals_by_id = {}
    total_value = 0.0

    for activity, meter, meter_type in db.execute(stmt).all():
        price = float(meter.price or 0)
        total_value += price
        meter_type_label = _meter_type_label(meter_type)

        rows.append(
            {
                "id": activity.id,
                "activity_id": activity.id,
                "sold_date": activity.timestamp_start,
                "serial_number": meter.serial_number,
                "meter_owner": meter.meter_owner,
                "contact_name": meter.contact_name,
                "price": price,
                "meter_type_id": meter_type.id,
                "meter_type": meter_type_label,
                "brand": meter_type.brand,
                "series": meter_type.series,
                "model": meter_type.model,
                "size": meter_type.size,
                "description": meter_type.description,
            }
        )

        if meter_type.id not in type_totals_by_id:
            type_totals_by_id[meter_type.id] = {
                "id": meter_type.id,
                "meter_type": meter_type_label,
                "brand": meter_type.brand,
                "series": meter_type.series,
                "model": meter_type.model,
                "size": meter_type.size,
                "description": meter_type.description,
                "quantity": 0,
                "total_value": 0.0,
            }
        type_totals_by_id[meter_type.id]["quantity"] += 1
        type_totals_by_id[meter_type.id]["total_value"] += price

    type_totals = sorted(
        type_totals_by_id.values(),
        key=lambda row: (row["size"], row["meter_type"]),
    )

    return {
        "rows": rows,
        "summary": {
            "quantity": len(rows),
            "total_value": total_value,
        },
        "type_totals": type_totals,
    }


def build_sold_meters_pdf(
    db: Session,
    from_date: date,
    to_date: date,
    min_size: int | None = None,
    max_size: int | None = None,
):
    report = get_sold_meters_report(db, from_date, to_date, min_size, max_size)

    html_content = templates.get_template("sold_meters_report.html").render(
        rows=report["rows"],
        summary=report["summary"],
        type_totals=report["type_totals"],
        from_date=from_date,
        to_date=to_date,
        min_size=min_size,
        max_size=max_size,
    )
    pdf_io = BytesIO()
    HTML(string=html_content).write_pdf(pdf_io)
    pdf_io.seek(0)
    return pdf_io
