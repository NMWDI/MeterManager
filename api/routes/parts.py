from fastapi import Depends, APIRouter, HTTPException, Query
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import select, func, literal, union_all
from typing import List, Union, Optional
from datetime import datetime, date, time
from fastapi.responses import StreamingResponse
from weasyprint import HTML
from io import BytesIO
from api.models.main_models import (
    Parts,
    PartsUsed,
    PartsAdded,
    PartAssociation,
    PartTypeLU,
    Meters,
    MeterTypeLU,
    meterRegisters,
    MeterActivities,
    workOrders,
)
from api.schemas import part_schemas
from api.session import get_db
from api.route_util import _get
from api.enums import ScopedUser
from sqlalchemy.exc import IntegrityError
from pathlib import Path
from jinja2 import Environment, FileSystemLoader, select_autoescape

TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"

templates = Environment(
    loader=FileSystemLoader(TEMPLATES_DIR),
    autoescape=select_autoescape(["html", "xml"]),
)

part_router = APIRouter()


@part_router.get(
    "/parts",
    response_model=List[part_schemas.Part],
    dependencies=[Depends(ScopedUser.Read)],
    tags=["Parts"],
)
def get_parts(
    db: Session = Depends(get_db),
    in_use: Optional[bool] = Query(None, description="Filter by in_use status"),
):
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


@part_router.get(
    "/parts/used",
    tags=["Parts"],
    dependencies=[Depends(ScopedUser.Read)],
)
def get_parts_used_summary(
    from_date: date = Query(..., description="Start date YYYY-MM-DD"),
    to_date: date = Query(..., description="End date YYYY-MM-DD"),
    parts: List[int] = Query(...),
    db: Session = Depends(get_db),
):
    # Convert to datetimes for inclusive range
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
        total = price * quantity
        results.append(
            {
                "id": row.id,
                "part_number": row.part_number,
                "description": row.description,
                "price": price,
                "quantity": quantity,
                "total": total,
            }
        )

    return results


@part_router.get(
    "/parts/used/pdf",
    tags=["Parts"],
    dependencies=[Depends(ScopedUser.Read)],
)
def download_parts_used_pdf(
    from_date: date = Query(..., description="Start date YYYY-MM-DD"),
    to_date: date = Query(..., description="End date YYYY-MM-DD"),
    parts: List[int] = Query(...),
    db: Session = Depends(get_db),
):
    # Re-use your existing logic
    results = get_parts_used_summary(
        from_date=from_date, to_date=to_date, parts=parts, db=db
    )

    # Add running total just for PDF
    running_total = 0.0
    for r in results:
        running_total += r["total"]
        r["running_total"] = running_total

    template = templates.get_template("parts_used_report.html")
    html_content = template.render(
        rows=results,
        from_date=from_date,
        to_date=to_date,
    )
    pdf_io = BytesIO()
    HTML(string=html_content).write_pdf(pdf_io)
    pdf_io.seek(0)

    return StreamingResponse(
        pdf_io,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=parts_used_report.pdf"},
    )


@part_router.get(
    "/part_types",
    response_model=List[part_schemas.PartTypeLU],
    dependencies=[Depends(ScopedUser.Read)],
    tags=["Parts"],
)
def get_part_types(db: Session = Depends(get_db)):
    return db.scalars(select(PartTypeLU)).all()


@part_router.get(
    "/part",
    response_model=Union[part_schemas.Part, part_schemas.Register],
    dependencies=[Depends(ScopedUser.Read)],
    tags=["Parts"],
)
def get_part(part_id: int, db: Session = Depends(get_db)):
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

    row = db.execute(
        select(Parts, current_count)
        .outerjoin(used_subq, used_subq.c.part_id == Parts.id)
        .outerjoin(added_subq, added_subq.c.part_id == Parts.id)
        .where(Parts.id == part_id)
        .options(
            selectinload(Parts.part_type),
            selectinload(Parts.meter_types),
        )
    ).first()

    if not row:
        return None

    selected_part, curr = row
    selected_part.current_count = curr

    # Create the part_schemas.Part instance
    returned_part = part_schemas.Part.model_validate(selected_part)

    # If part_type is a Register, we need to load the register details
    if selected_part and selected_part.part_type.name == "Register":
        register_details = db.scalars(
            select(meterRegisters).where(meterRegisters.part_id == selected_part.id)
        ).first()

        register_details_obj = None
        if register_details is not None:
            register_details_obj = (
                part_schemas.Register.register_details.model_validate(register_details)
            )

        # Update the returned_part to include register details
        returned_part = part_schemas.Register(
            **returned_part.model_dump(exclude_unset=True),
            register_settings=register_details_obj,
        )

    return returned_part


@part_router.patch(
    "/part",
    response_model=part_schemas.Part,
    dependencies=[Depends(ScopedUser.Admin)],
    tags=["Parts"],
)
def update_part(updated_part: part_schemas.Part, db: Session = Depends(get_db)):
    # Update the part (this won't include secondary attributes like associations)
    part_db = _get(db, Parts, updated_part.id)

    for k, v in updated_part.model_dump(exclude_unset=True).items():
        if k in ["part_type", "meter_types", "current_count"]:
            continue
        try:
            setattr(part_db, k, v)
        except AttributeError as e:
            print(e)
            continue

    try:
        db.add(part_db)
        db.commit()
    except IntegrityError:
        raise HTTPException(status_code=409, detail="Part SN already exists")

    # Load the updated part to get the relationships
    part = db.scalars(
        select(Parts)
        .where(Parts.id == updated_part.id)
        .options(joinedload(Parts.part_type))
    ).first()

    # Update associations, _patch only handles direct attributes
    if updated_part.meter_types:
        part.meter_types = db.scalars(
            select(MeterTypeLU).where(
                MeterTypeLU.id.in_(map(lambda type: type.id, updated_part.meter_types))
            )
        ).all()

    db.commit()
    db.refresh(part)

    return part


@part_router.post(
    "/parts",
    response_model=part_schemas.Part,
    dependencies=[Depends(ScopedUser.Admin)],
    tags=["Parts"],
)
def create_part(new_part: part_schemas.Part, db: Session = Depends(get_db)):
    new_part_model = Parts(
        part_number=new_part.part_number,
        part_type_id=new_part.part_type_id,
        description=new_part.description,
        vendor=new_part.vendor,
        initial_count=new_part.initial_count,
        note=new_part.note,
        in_use=new_part.in_use,
        commonly_used=new_part.commonly_used,
        price=new_part.price,
    )

    try:
        db.add(new_part_model)
        db.commit()
    except IntegrityError:
        raise HTTPException(status_code=409, detail="Part SN already exists")

    # Associate with meter types
    if new_part.meter_types:
        new_part_model.meter_types = db.scalars(
            select(MeterTypeLU).where(
                MeterTypeLU.id.in_(map(lambda type: type.id, new_part.meter_types))
            )
        ).all()

    db.commit()
    db.refresh(new_part_model)

    # Load part_type relationship
    new_part_model.part_type

    return new_part_model


@part_router.get(
    "/meter_parts",
    response_model=List[part_schemas.Part],
    dependencies=[Depends(ScopedUser.Read)],
    tags=["Parts"],
)
def get_meter_parts(meter_id: int, db: Session = Depends(get_db)):
    meter_type_id = db.scalars(
        select(Meters.meter_type_id).where(Meters.id == meter_id)
    ).first()

    part_id_list = db.scalars(
        select(PartAssociation.c.part_id).where(
            PartAssociation.c.meter_type_id == meter_type_id
        )
    ).all()

    meter_parts = db.scalars(
        select(Parts)
        .where(Parts.id.in_(part_id_list))
        .options(joinedload(Parts.part_type))
    ).all()

    return meter_parts


@part_router.post(
    "/parts/add",
    response_model=part_schemas.Part,
    dependencies=[Depends(ScopedUser.Admin)],
    tags=["Parts"],
)
def add_parts(payload: part_schemas.PartsAddRequest, db: Session = Depends(get_db)):
    # Ensure part exists
    part = db.scalars(select(Parts).where(Parts.id == payload.part_id)).first()
    if not part:
        raise HTTPException(status_code=404, detail="Part not found")

    # Insert PartsAdded row (do NOT mutate Parts.initial_count)
    added = PartsAdded(
        part_id=payload.part_id,
        count=payload.count,
        date=payload.date,
        note=payload.note,
    )
    db.add(added)
    db.commit()

    # Return updated part with current_count computed (same formula)
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


@part_router.get(
    "/parts/{part_id}/history",
    response_model=part_schemas.PartHistoryResponse,
    dependencies=[Depends(ScopedUser.Admin)],
    tags=["Parts"],
)
def get_part_history(part_id: int, db: Session = Depends(get_db)):
    part = db.scalars(select(Parts).where(Parts.id == part_id)).first()
    if not part:
        raise HTTPException(status_code=404, detail="Part not found")

    # ADDED events (date is a DATE)
    added_q = select(
        PartsAdded.id.label("ref_id"),
        PartsAdded.part_id.label("part_id"),
        PartsAdded.date.label("event_date"),  # date
        literal("added").label("event_type"),
        PartsAdded.note.label("note"),
        PartsAdded.count.label("delta"),
        literal(None).label("work_order_id"),
    ).where(PartsAdded.part_id == part_id)

    # USED events (datetime comes from MeterActivities.timestamp_start)
    used_q = (
        select(
            PartsUsed.id.label("ref_id"),
            PartsUsed.part_id.label("part_id"),
            MeterActivities.timestamp_start.label("event_date"),  # datetime
            literal("used").label("event_type"),
            func.coalesce(
                func.nullif(func.trim(MeterActivities.description), ""),
                func.nullif(func.trim(workOrders.description), ""),
                func.nullif(func.trim(workOrders.notes), ""),
                func.nullif(func.trim(workOrders.title), ""),
            ).label("note"),
            (-PartsUsed.count).label("delta"),
            MeterActivities.work_order_id.label("work_order_id"),
        )
        .join(MeterActivities, MeterActivities.id == PartsUsed.meter_activity_id)
        .outerjoin(
            workOrders,
            workOrders.id == MeterActivities.work_order_id,
        )
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

    history: list[part_schemas.PartHistoryRow] = [
        part_schemas.PartHistoryRow(
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
        # convert DATE -> DATETIME if needed
        if not isinstance(event_date, datetime):
            event_date = datetime.combine(event_date, time.min)

        running += int(delta)

        history.append(
            part_schemas.PartHistoryRow(
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

    current_count = running

    return part_schemas.PartHistoryResponse(
        part_id=part.id,
        part_number=part.part_number,
        initial_count=part.initial_count,
        current_count=current_count,
        history=history,
    )
