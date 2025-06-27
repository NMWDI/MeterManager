from fastapi import Depends, APIRouter, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, func
from typing import List, Union, Optional
from datetime import datetime
import calendar
from fastapi.responses import StreamingResponse
from weasyprint import HTML
from io import BytesIO
from jinja2 import Template

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

part_router = APIRouter()


@part_router.get(
    "/parts",
    response_model=List[part_schemas.Part],
    dependencies=[Depends(ScopedUser.Read)],
    tags=["Parts"],
)
def get_parts(
    db: Session = Depends(get_db),
    in_use: Optional[bool] = Query(
        None,
        description="Filter by in_use status"
    ),
):
    stmt = select(Parts).options(joinedload(Parts.part_type))

    if in_use is not None:
        stmt = stmt.where(Parts.in_use == in_use)

    return db.scalars(stmt).all()


@part_router.get(
    "/parts/used",
    tags=["Parts"],
    dependencies=[Depends(ScopedUser.Read)],
)
def get_parts_used_summary(
    from_month: str = Query(..., pattern=r"^\d{4}-\d{2}$"),
    to_month: str = Query(..., pattern=r"^\d{4}-\d{2}$"),
    parts: List[int] = Query(...),
    db: Session = Depends(get_db),
):
    try:
        # Parse and normalize start of "from" month
        from_date = datetime.strptime(from_month, "%Y-%m").replace(day=1)

        # Determine end of "to" month
        to_dt = datetime.strptime(to_month, "%Y-%m")
        year, month = to_dt.year, to_dt.month
        today = datetime.now()

        if year == today.year and month == today.month:
            to_date = today
        else:
            last_day = calendar.monthrange(year, month)[1]
            to_date = to_dt.replace(
                day=last_day,
                hour=23,
                minute=59,
                second=59
            )
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid date format. Use YYYY-MM."
        )

    usage_subq = (
        db.query(
            PartsUsed.c.part_id.label("used_part_id"),
            func.count(PartsUsed.c.part_id).label("quantity")
        )
        .join(
              MeterActivities,
              MeterActivities.id == PartsUsed.c.meter_activity_id
        )
        .filter(
            MeterActivities.timestamp_start >= from_date,
            MeterActivities.timestamp_start <= to_date,
            PartsUsed.c.part_id.in_(parts),
        )
        .group_by(PartsUsed.c.part_id)
        .subquery()
    )

    query = (
        db.query(
            Parts.id.label("id"),
            Parts.part_number,
            Parts.description,
            Parts.price,
            func.coalesce(usage_subq.c.quantity, 0).label("quantity")
        )
        .outerjoin(usage_subq, Parts.id == usage_subq.c.used_part_id)
        .filter(Parts.id.in_(parts))
        .order_by(Parts.part_number)
    )

    results = []
    for row in query.all():
        price = row.price or 0
        total = price * row.quantity
        results.append({
            "id": row.id,
            "part_number": row.part_number,
            "description": row.description,
            "price": price,
            "quantity": row.quantity,
            "total": total,
        })

    return results


@part_router.get(
    "/parts/used/pdf",
    tags=["Parts"],
    dependencies=[Depends(ScopedUser.Read)],
)
def download_parts_used_pdf(
    from_month: str = Query(..., pattern=r"^\d{4}-\d{2}$"),
    to_month: str = Query(..., pattern=r"^\d{4}-\d{2}$"),
    parts: List[int] = Query(...),
    db: Session = Depends(get_db),
):
    try:
        from_date = datetime.strptime(from_month, "%Y-%m").replace(day=1)
        to_dt = datetime.strptime(to_month, "%Y-%m")
        year, month = to_dt.year, to_dt.month
        today = datetime.now()

        if year == today.year and month == today.month:
            to_date = today
        else:
            last_day = calendar.monthrange(year, month)[1]
            to_date = to_dt.replace(
                day=last_day,
                hour=23,
                minute=59,
                second=59
            )
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid date format. Use YYYY-MM."
        )

    usage_subq = (
        db.query(
            PartsUsed.c.part_id.label("used_part_id"),
            func.count(PartsUsed.c.part_id).label("quantity")
        )
        .join(
              MeterActivities,
              MeterActivities.id == PartsUsed.c.meter_activity_id
          )
        .filter(
            MeterActivities.timestamp_start >= from_date,
            MeterActivities.timestamp_start <= to_date,
            PartsUsed.c.part_id.in_(parts),
        )
        .group_by(PartsUsed.c.part_id)
        .subquery()
    )

    query = (
        db.query(
            Parts.id.label("id"),
            Parts.part_number,
            Parts.description,
            Parts.price,
            func.coalesce(usage_subq.c.quantity, 0).label("quantity")
        )
        .outerjoin(usage_subq, Parts.id == usage_subq.c.used_part_id)
        .filter(Parts.id.in_(parts))
        .order_by(Parts.part_number)
    )

    results = []
    running_total = 0.0
    for row in query.all():
        price = row.price or 0
        quantity = row.quantity or 0
        total = price * quantity
        running_total += total
        results.append({
            "part_number": row.part_number,
            "description": row.description,
            "price": price,
            "quantity": quantity,
            "total": total,
            "running_total": running_total,
        })

    html_template = Template("""
    <html>
      <head>
        <style>
          body { font-family: sans-serif; }
          table { width: 100%; border-collapse: collapse; margin-top: 1em; }
          th, td { border: 1px solid #ccc; padding: 6px; text-align: left; }
          th { background-color: #f5f5f5; }
        </style>
      </head>
      <body>
        <h2>Parts Usage Report</h2>
        <p>
            <strong>From:</strong>
            {{ from_month }} &nbsp;
            <strong>To:</strong>
            {{ to_month }}
        </p>
        <table>
          <thead>
            <tr>
              <th>Part #</th>
              <th>Description</th>
              <th>Price</th>
              <th>Quantity</th>
              <th>Total</th>
              <th>Running Total</th>
            </tr>
          </thead>
          <tbody>
            {% for row in rows %}
              <tr>
                <td>{{ row.part_number }}</td>
                <td>{{ row.description }}</td>
                <td>${{ "%.2f"|format(row.price) }}</td>
                <td>{{ row.quantity }}</td>
                <td>${{ "%.2f"|format(row.total) }}</td>
                <td>${{ "%.2f"|format(row.running_total) }}</td>
              </tr>
            {% endfor %}
          </tbody>
        </table>
      </body>
    </html>
    """)

    html_content = html_template.render(
        rows=results,
        from_month=from_month,
        to_month=to_month
    )
    pdf_io = BytesIO()
    HTML(string=html_content).write_pdf(pdf_io)
    pdf_io.seek(0)

    return StreamingResponse(
        pdf_io,
        media_type="application/pdf",
        headers={
            "Content-Disposition": "attachment; filename=parts_used_report.pdf"
        },
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
    selected_part = db.scalars(
        select(Parts)
        .where(Parts.id == part_id)
        .options(
            joinedload(Parts.part_type),
            joinedload(Parts.meter_types),
        )
    ).first()

    # Create the part_schemas.Part instance
    returned_part = part_schemas.Part.model_validate(selected_part)

    # If part_type is a Register, we need to load the register details
    if selected_part and selected_part.part_type.name == "Register":
        register_details = db.scalars(
            select(meterRegisters).where(
                meterRegisters.part_id == selected_part.id
            )
        ).first()

        register_details = part_schemas.Register.register_details.model_validate(register_details)

        # Update the returned_part to include register details
        returned_part = part_schemas.Register(
            **returned_part.model_dump(exclude_unset=True),
            register_settings=register_details
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
        if k in ["part_type", "meter_types"]:
            continue
        try:
            setattr(part_db, k, v)
        except AttributeError as e:
            print(e)
            continue

    try:
        db.add(part_db)
        db.commit()
    except IntegrityError as e:
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
        count=new_part.count,
        note=new_part.note,
        in_use=new_part.in_use,
        commonly_used=new_part.commonly_used,
        price=new_part.price,
    )

    try:
        db.add(new_part_model)
        db.commit()
    except IntegrityError as e:
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
