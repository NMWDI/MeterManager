from fastapi import Depends, APIRouter, HTTPException, Query
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import select, func
from typing import List, Union, Optional
from datetime import datetime, date
from fastapi.responses import StreamingResponse
from weasyprint import HTML
from io import BytesIO
from api.models.main_models import (
    Parts,
    PartsUsed,
    PartAssociation,
    PartTypeLU,
    Meters,
    MeterTypeLU,
    meterRegisters,
    MeterActivities,
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
    used_sum = func.coalesce(func.sum(PartsUsed.count), 0)
    current_count = (Parts.initial_count - used_sum).label("current_count")

    stmt = (
        select(Parts, current_count)
        .outerjoin(PartsUsed, PartsUsed.part_id == Parts.id)
        .options(selectinload(Parts.part_type))
        .group_by(Parts.id)  # important for aggregates
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
    used_sum = func.coalesce(func.sum(PartsUsed.count), 0)
    current_count = (Parts.initial_count - used_sum).label("current_count")

    row = db.execute(
        select(Parts, current_count)
        .outerjoin(PartsUsed, PartsUsed.part_id == Parts.id)
        .where(Parts.id == part_id)
        .options(
            selectinload(Parts.part_type),
            selectinload(Parts.meter_types),
        )
        .group_by(Parts.id)
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

        register_details = part_schemas.Register.register_details.model_validate(
            register_details
        )

        # Update the returned_part to include register details
        returned_part = part_schemas.Register(
            **returned_part.model_dump(exclude_unset=True),
            register_settings=register_details,
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
