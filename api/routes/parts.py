from datetime import date
from typing import List, Optional, Union

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from api.auth.dependencies import ScopedUser
from api.models.meter import MeterTypeLU, Meters
from api.models.part import PartAssociation, PartTypeLU, Parts
from api.routes.utils import _get
from api.schemas import parts
from api.services import parts as part_service
from api.session import get_db


part_router = APIRouter()


@part_router.get(
    "/parts",
    response_model=List[parts.Part],
    dependencies=[Depends(ScopedUser.Read)],
    tags=["Parts"],
)
def get_parts(
    db: Session = Depends(get_db),
    in_use: Optional[bool] = Query(None, description="Filter by in_use status"),
):
    return part_service.list_parts(db, in_use)


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
    return part_service.get_parts_used_summary(db, from_date, to_date, parts)


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
    pdf_io = part_service.build_parts_used_pdf(db, from_date, to_date, parts)

    return StreamingResponse(
        pdf_io,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=parts_used_report.pdf"},
    )


@part_router.get(
    "/part_types",
    response_model=List[parts.PartTypeLU],
    dependencies=[Depends(ScopedUser.Read)],
    tags=["Parts"],
)
def get_part_types(db: Session = Depends(get_db)):
    return db.scalars(select(PartTypeLU)).all()


@part_router.get(
    "/part",
    response_model=Union[parts.Part, parts.Register],
    dependencies=[Depends(ScopedUser.Read)],
    tags=["Parts"],
)
def get_part(part_id: int, db: Session = Depends(get_db)):
    return part_service.get_part(db, part_id)


@part_router.patch(
    "/part",
    response_model=parts.Part,
    dependencies=[Depends(ScopedUser.Admin)],
    tags=["Parts"],
)
def update_part(updated_part: parts.Part, db: Session = Depends(get_db)):
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

    part = db.scalars(
        select(Parts).where(Parts.id == updated_part.id).options(joinedload(Parts.part_type))
    ).first()

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
    response_model=parts.Part,
    dependencies=[Depends(ScopedUser.Admin)],
    tags=["Parts"],
)
def create_part(new_part: parts.Part, db: Session = Depends(get_db)):
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

    if new_part.meter_types:
        new_part_model.meter_types = db.scalars(
            select(MeterTypeLU).where(
                MeterTypeLU.id.in_(map(lambda type: type.id, new_part.meter_types))
            )
        ).all()

    db.commit()
    db.refresh(new_part_model)
    new_part_model.part_type

    return new_part_model


@part_router.get(
    "/meter_parts",
    response_model=List[parts.Part],
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
    response_model=parts.Part,
    dependencies=[Depends(ScopedUser.Admin)],
    tags=["Parts"],
)
def add_parts(payload: parts.PartsAddRequest, db: Session = Depends(get_db)):
    return part_service.add_parts(db, payload)


@part_router.get(
    "/parts/{part_id}/history",
    response_model=parts.PartHistoryResponse,
    dependencies=[Depends(ScopedUser.Admin)],
    tags=["Parts"],
)
def get_part_history(part_id: int, db: Session = Depends(get_db)):
    return part_service.build_part_history_response(part_id, db)


@part_router.patch(
    "/parts/{part_id}/history",
    response_model=parts.PartHistoryResponse,
    dependencies=[Depends(ScopedUser.Admin)],
    tags=["Parts"],
)
def patch_part_history(
    part_id: int,
    payload: parts.PartHistoryUpdateRequest,
    db: Session = Depends(get_db),
):
    return part_service.patch_part_history(db, part_id, payload)
