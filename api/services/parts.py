from datetime import date, datetime, time
from io import BytesIO
from pathlib import Path
from typing import Optional

from fastapi import HTTPException
from jinja2 import Environment, FileSystemLoader, select_autoescape
from sqlalchemy import func, literal, select, union_all, case
from sqlalchemy.orm import Session, selectinload
from weasyprint import HTML

from api.models.meter import MeterActivities, meterRegisters
from api.models.part import Parts, PartsAdded, PartsUsed
from api.schemas import parts


TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"
templates = Environment(
    loader=FileSystemLoader(TEMPLATES_DIR),
    autoescape=select_autoescape(["html", "xml"]),
)


def _part_count_subqueries():
    used_subq = (
        select(
            PartsUsed.part_id.label("part_id"),
            func.coalesce(func.sum(PartsUsed.count), 0).label("used_sum"),
        )
        .group_by(PartsUsed.part_id)
        .subquery()
    )
    added_subq = (
        select(
            PartsAdded.part_id.label("part_id"),
            func.coalesce(func.sum(PartsAdded.count), 0).label("added_sum"),
        )
        .group_by(PartsAdded.part_id)
        .subquery()
    )
    current_count = (
        Parts.initial_count
        + func.coalesce(added_subq.c.added_sum, 0)
        - func.coalesce(used_subq.c.used_sum, 0)
    ).label("current_count")
    return used_subq, added_subq, current_count


def build_part_history_response(part_id: int, db: Session) -> parts.PartHistoryResponse:
    part = db.scalars(select(Parts).where(Parts.id == part_id)).first()
    if not part:
        raise HTTPException(status_code=404, detail="Part not found")

    added_q = select(
        PartsAdded.id.label("ref_id"),
        PartsAdded.part_id.label("part_id"),
        PartsAdded.date.label("event_date"),
        literal("added").label("event_type"),
        PartsAdded.note.label("note"),
        PartsAdded.count.label("delta"),
        literal(None).label("work_order_id"),
    ).where(PartsAdded.part_id == part_id)

    used_q = (
        select(
            PartsUsed.id.label("ref_id"),
            PartsUsed.part_id.label("part_id"),
            MeterActivities.timestamp_start.label("event_date"),
            case(
                (MeterActivities.work_order_id.is_not(None), literal("workorder")),
                else_=literal("used"),
            ).label("event_type"),
            func.nullif(func.trim(MeterActivities.description), "").label("note"),
            (-PartsUsed.count).label("delta"),
            MeterActivities.work_order_id.label("work_order_id"),
        )
        .join(MeterActivities, MeterActivities.id == PartsUsed.meter_activity_id)
        .where(PartsUsed.part_id == part_id)
    )

    events = union_all(added_q, used_q).subquery()
    rows = db.execute(
        select(
            events.c.ref_id,
            events.c.part_id,
            events.c.event_date,
            events.c.event_type,
            events.c.note,
            events.c.delta,
            events.c.work_order_id,
        ).order_by(events.c.event_date.asc(), events.c.ref_id.asc())
    ).all()

    running = int(part.initial_count)
    history: list[parts.PartHistoryRow] = [
        parts.PartHistoryRow(
            row_id=f"initial-{part_id}",
            part_id=part_id,
            event_date=datetime.min,
            event_type="initial",
            ref_id=None,
            note="Initial count",
            delta=0,
            total_after=running,
            work_order_id=None,
        )
    ]

    for ref_id, pid, event_date, event_type, note, delta, work_order_id in rows:
        if not isinstance(event_date, datetime):
            event_date = datetime.combine(event_date, time.min)
        running += int(delta)
        history.append(
            parts.PartHistoryRow(
                row_id=f"{event_type}-{ref_id}",
                part_id=pid,
                event_date=event_date,
                event_type=event_type,
                ref_id=ref_id,
                note=note,
                delta=int(delta),
                total_after=running,
                work_order_id=work_order_id,
            )
        )

    return parts.PartHistoryResponse(
        part_id=part.id,
        part_number=part.part_number,
        initial_count=part.initial_count,
        current_count=running,
        history=history,
    )


def list_parts(db: Session, in_use: Optional[bool] = None):
    used_subq, added_subq, current_count = _part_count_subqueries()
    stmt = (
        select(Parts, current_count)
        .outerjoin(used_subq, used_subq.c.part_id == Parts.id)
        .outerjoin(added_subq, added_subq.c.part_id == Parts.id)
        .options(selectinload(Parts.part_type))
    )
    if in_use is not None:
        stmt = stmt.where(Parts.in_use == in_use)
    rows = db.execute(stmt).all()
    results = []
    for part, curr in rows:
        part.current_count = curr
        results.append(part)
    return results


def get_parts_used_summary(
    db: Session, from_date: date, to_date: date, parts: list[int]
):
    start_dt = datetime.combine(from_date, datetime.min.time())
    end_dt = datetime.combine(to_date, datetime.max.time())
    usage_subq = (
        db.query(
            PartsUsed.part_id.label("used_part_id"),
            func.coalesce(func.sum(PartsUsed.count), 0).label("quantity"),
        )
        .join(MeterActivities, MeterActivities.id == PartsUsed.meter_activity_id)
        .filter(
            MeterActivities.timestamp_start >= start_dt,
            MeterActivities.timestamp_start <= end_dt,
            PartsUsed.part_id.in_(parts),
        )
        .group_by(PartsUsed.part_id)
        .subquery()
    )
    query = (
        db.query(
            Parts.id.label("id"),
            Parts.part_number,
            Parts.description,
            Parts.price,
            func.coalesce(usage_subq.c.quantity, 0).label("quantity"),
        )
        .outerjoin(usage_subq, Parts.id == usage_subq.c.used_part_id)
        .filter(Parts.id.in_(parts))
        .order_by(Parts.part_number)
    )
    results = []
    for row in query.all():
        price = float(row.price or 0)
        quantity = int(row.quantity or 0)
        results.append(
            {
                "id": row.id,
                "part_number": row.part_number,
                "description": row.description,
                "price": price,
                "quantity": quantity,
                "total": price * quantity,
            }
        )
    return results


def build_parts_used_pdf(db: Session, from_date: date, to_date: date, parts: list[int]):
    results = get_parts_used_summary(db, from_date, to_date, parts)
    running_total = 0.0
    for row in results:
        running_total += row["total"]
        row["running_total"] = running_total

    html_content = templates.get_template("parts_used_report.html").render(
        rows=results,
        from_date=from_date,
        to_date=to_date,
    )
    pdf_io = BytesIO()
    HTML(string=html_content).write_pdf(pdf_io)
    pdf_io.seek(0)
    return pdf_io


def get_part(db: Session, part_id: int):
    used_subq, added_subq, current_count = _part_count_subqueries()
    row = db.execute(
        select(Parts, current_count)
        .outerjoin(used_subq, used_subq.c.part_id == Parts.id)
        .outerjoin(added_subq, added_subq.c.part_id == Parts.id)
        .where(Parts.id == part_id)
        .options(selectinload(Parts.part_type), selectinload(Parts.meter_types))
    ).first()
    if not row:
        return None

    selected_part, curr = row
    selected_part.current_count = curr
    returned_part = parts.Part.model_validate(selected_part)

    if selected_part.part_type.name == "Register":
        register_details = db.scalars(
            select(meterRegisters).where(meterRegisters.part_id == selected_part.id)
        ).first()
        register_details_obj = None
        if register_details is not None:
            register_details_obj = parts.Register.register_details.model_validate(
                register_details
            )
        returned_part = parts.Register(
            **returned_part.model_dump(exclude_unset=True),
            register_settings=register_details_obj,
        )
    return returned_part


def add_parts(db: Session, payload: parts.PartsAddRequest):
    part = db.scalars(select(Parts).where(Parts.id == payload.part_id)).first()
    if not part:
        raise HTTPException(status_code=404, detail="Part not found")

    db.add(
        PartsAdded(
            part_id=payload.part_id,
            count=payload.count,
            date=payload.date,
            note=payload.note,
        )
    )
    db.commit()

    used_subq, added_subq, current_count = _part_count_subqueries()
    row = db.execute(
        select(Parts, current_count)
        .outerjoin(used_subq, used_subq.c.part_id == Parts.id)
        .outerjoin(added_subq, added_subq.c.part_id == Parts.id)
        .where(Parts.id == payload.part_id)
        .options(selectinload(Parts.part_type), selectinload(Parts.meter_types))
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Part not found")
    part_obj, curr = row
    part_obj.current_count = curr
    return part_obj


def patch_part_history(
    db: Session, part_id: int, payload: parts.PartHistoryUpdateRequest
):
    part = db.scalars(select(Parts).where(Parts.id == part_id)).first()
    if not part:
        raise HTTPException(status_code=404, detail="Part not found")

    for row in payload.rows:
        normalized_note = row.note.strip() if row.note else None
        if normalized_note == "":
            normalized_note = None

        if row.event_type == "added":
            if row.delta <= 0:
                raise HTTPException(
                    status_code=422,
                    detail="Added parts rows must have a positive change.",
                )
            added_row = db.scalars(
                select(PartsAdded).where(
                    PartsAdded.id == row.ref_id,
                    PartsAdded.part_id == part_id,
                )
            ).first()
            if not added_row:
                raise HTTPException(
                    status_code=404, detail="Parts added row not found."
                )
            added_row.count = row.delta
            added_row.date = row.event_date.date()
            added_row.note = normalized_note
            continue

        if row.delta >= 0:
            raise HTTPException(
                status_code=422,
                detail="Work order rows must have a negative change.",
            )
        parts_used_row = db.scalars(
            select(PartsUsed).where(
                PartsUsed.id == row.ref_id,
                PartsUsed.part_id == part_id,
            )
        ).first()
        if not parts_used_row:
            raise HTTPException(status_code=404, detail="Parts used row not found.")
        activity = db.scalars(
            select(MeterActivities).where(
                MeterActivities.id == parts_used_row.meter_activity_id
            )
        ).first()
        if not activity:
            raise HTTPException(
                status_code=404,
                detail="Meter activity for parts used row not found.",
            )
        duration = (
            activity.timestamp_end - activity.timestamp_start
            if activity.timestamp_end and activity.timestamp_start
            else None
        )
        parts_used_row.count = abs(row.delta)
        activity.timestamp_start = row.event_date
        activity.description = normalized_note
        activity.timestamp_end = (
            row.event_date + duration if duration is not None else row.event_date
        )

    db.commit()
    return build_part_history_response(part_id, db)
