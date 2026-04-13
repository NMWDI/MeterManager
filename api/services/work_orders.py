from datetime import datetime

from fastapi import HTTPException
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from api.models.meter import Meters, MeterActivities
from api.models.user import Users
from api.models.work_order import workOrders, workOrderStatusLU
from api.schemas import meter


def _work_order_query():
    return (
        select(workOrders)
        .options(
            joinedload(workOrders.status),
            joinedload(workOrders.meter).joinedload(Meters.status),
            joinedload(workOrders.assigned_user),
        )
    )


def _load_associated_activities(db: Session, work_order_ids: list[int]):
    if not work_order_ids:
        return {}

    relevant_activities = db.scalars(
        select(MeterActivities)
        .options(
            joinedload(MeterActivities.location),
            joinedload(MeterActivities.meter).joinedload(Meters.status),
        )
        .where(MeterActivities.work_order_id.in_(work_order_ids))
    ).all()

    activities_by_work_order = {}
    for activity in relevant_activities:
        activities_by_work_order.setdefault(activity.work_order_id, []).append(
            {
                "id": activity.id,
                "timestamp_start": activity.timestamp_start,
                "timestamp_end": activity.timestamp_end,
                "description": activity.description,
                "submitting_user_id": activity.submitting_user_id,
                "meter_id": activity.meter_id,
                "meter_status": activity.meter.status.status_name
                if activity.meter and activity.meter.status
                else None,
                "activity_type_id": activity.activity_type_id,
                "location_id": activity.location_id,
                "location_name": activity.location.name if activity.location else None,
                "ose_share": activity.ose_share,
                "water_users": activity.water_users,
            }
        )

    return activities_by_work_order


def _serialize_work_order(
    work_order: workOrders,
    associated_activities: list[dict] | list[MeterActivities] | None = None,
) -> meter.WorkOrder:
    return meter.WorkOrder(
        work_order_id=work_order.id,
        ose_request_id=work_order.ose_request_id,
        date_created=work_order.date_created,
        creator=work_order.creator,
        meter_id=work_order.meter.id,
        meter_serial=work_order.meter.serial_number,
        meter_status=work_order.meter.status.status_name
        if work_order.meter and work_order.meter.status
        else None,
        title=work_order.title,
        description=work_order.description,
        status=work_order.status.name,
        notes=work_order.notes,
        assigned_user_id=work_order.assigned_user_id,
        assigned_user=work_order.assigned_user.username
        if work_order.assigned_user
        else None,
        associated_activities=associated_activities,
    )


def list_work_orders(
    db: Session,
    filter_by_status: list[str],
    start_date: datetime,
    work_order_id: list[int] | None = None,
    assigned_user_id: int | None = None,
    q: str | None = None,
):
    stmt = (
        _work_order_query()
        .join(workOrderStatusLU)
        .where(workOrderStatusLU.name.in_(filter_by_status))
        .where(workOrders.date_created >= start_date)
    )

    if work_order_id:
        stmt = stmt.where(workOrders.id.in_(work_order_id))

    if assigned_user_id:
        stmt = stmt.where(workOrders.assigned_user_id == assigned_user_id)

    if q:
        q_like = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                workOrders.title.ilike(q_like),
                workOrders.description.ilike(q_like),
                workOrders.creator.ilike(q_like),
                workOrders.notes.ilike(q_like),
                workOrders.meter.has(Meters.serial_number.ilike(q_like)),
            )
        )

    work_order_rows = db.scalars(stmt).all()
    activities_by_work_order = _load_associated_activities(
        db, [work_order.id for work_order in work_order_rows]
    )

    return [
        {
            "work_order_id": work_order.id,
            "ose_request_id": work_order.ose_request_id,
            "date_created": work_order.date_created,
            "creator": work_order.creator,
            "meter_id": work_order.meter.id,
            "meter_serial": work_order.meter.serial_number,
            "meter_status": work_order.meter.status.status_name
            if work_order.meter and work_order.meter.status
            else None,
            "title": work_order.title,
            "description": work_order.description,
            "status": work_order.status.name,
            "notes": work_order.notes,
            "assigned_user_id": work_order.assigned_user_id,
            "assigned_user": work_order.assigned_user.username
            if work_order.assigned_user
            else None,
            "associated_activities": activities_by_work_order.get(work_order.id, []),
        }
        for work_order in work_order_rows
    ]


def create_work_order(
    db: Session, new_work_order: meter.CreateWorkOrder
) -> meter.WorkOrder:
    open_status = db.scalars(
        select(workOrderStatusLU).where(workOrderStatusLU.name == "Open")
    ).first()

    work_order = workOrders(
        date_created=new_work_order.date_created,
        meter_id=new_work_order.meter_id,
        title=new_work_order.title,
        status_id=open_status.id,
    )

    if new_work_order.description:
        work_order.description = new_work_order.description
    if new_work_order.notes:
        work_order.notes = new_work_order.notes
    if new_work_order.assigned_user_id:
        work_order.assigned_user_id = new_work_order.assigned_user_id
    if new_work_order.creator:
        work_order.creator = new_work_order.creator
    if new_work_order.ose_request_id:
        work_order.ose_request_id = new_work_order.ose_request_id

    try:
        db.add(work_order)
        db.commit()
    except IntegrityError:
        raise HTTPException(
            status_code=409, detail="Title empty or already exists for this meter."
        )

    work_order = db.scalars(_work_order_query().where(workOrders.id == work_order.id)).first()
    return _serialize_work_order(work_order)


def update_work_order(
    db: Session,
    patch_work_order_form: meter.PatchWorkOrder,
    user: Users,
) -> meter.WorkOrder:
    comparison_work_order = meter.PatchWorkOrder(
        work_order_id=patch_work_order_form.work_order_id,
        status=patch_work_order_form.status,
        notes=patch_work_order_form.notes,
    )

    update_scope = "Technician" if comparison_work_order == patch_work_order_form else "Admin"

    if user.user_role.name not in [update_scope, "Admin"]:
        raise HTTPException(
            status_code=403,
            detail="User does not have permission to update this work order.",
        )

    work_order = db.scalars(
        _work_order_query().where(workOrders.id == patch_work_order_form.work_order_id)
    ).first()

    if user.user_role.name == "Technician" and work_order.assigned_user_id != user.id:
        raise HTTPException(
            status_code=403,
            detail="User does not have permission to update this work order.",
        )

    if patch_work_order_form.title == "":
        raise HTTPException(status_code=422, detail="Title cannot be empty.")

    if patch_work_order_form.title:
        work_order.title = patch_work_order_form.title
    if patch_work_order_form.description:
        work_order.description = patch_work_order_form.description
    if patch_work_order_form.status:
        new_status = db.scalars(
            select(workOrderStatusLU).where(
                workOrderStatusLU.name == patch_work_order_form.status
            )
        ).first()
        work_order.status_id = new_status.id
    if patch_work_order_form.notes:
        work_order.notes = patch_work_order_form.notes
    if patch_work_order_form.creator:
        work_order.creator = patch_work_order_form.creator
    if patch_work_order_form.assigned_user_id:
        work_order.assigned_user_id = patch_work_order_form.assigned_user_id

    try:
        db.commit()
    except IntegrityError:
        raise HTTPException(status_code=409, detail="Title already exists for this meter.")

    work_order = db.scalars(
        _work_order_query()
        .join(workOrderStatusLU)
        .where(workOrders.id == patch_work_order_form.work_order_id)
    ).first()
    associated_activities = db.scalars(
        select(MeterActivities).where(MeterActivities.work_order_id == work_order.id)
    ).all()

    return _serialize_work_order(work_order, associated_activities=list(associated_activities))


def delete_work_order(db: Session, work_order_id: int):
    work_order = db.scalars(
        select(workOrders).where(workOrders.id == work_order_id)
    ).first()

    if not work_order:
        raise HTTPException(status_code=404, detail="Work order not found.")

    db.delete(work_order)
    db.commit()

    return {"status": "success"}
