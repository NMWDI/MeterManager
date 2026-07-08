from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from api.auth.dependencies import ScopedUser
from api.enums import WorkOrderStatus
from api.schemas import meter
from api.security import get_current_user
from api.services import work_orders as work_order_service
from api.models.user import Users
from api.session import get_db


work_orders_router = APIRouter()


@work_orders_router.get(
    "/work_orders",
    dependencies=[Depends(ScopedUser.WorkOrderRead)],
    tags=["Work Orders"],
)
def get_work_orders(
    filter_by_status: Annotated[list[WorkOrderStatus], Query()] = [
        WorkOrderStatus.Open
    ],
    start_date: datetime = Query(datetime.strptime("2024-06-01", "%Y-%m-%d")),
    work_order_id: Annotated[list[int] | None, Query()] = None,
    assigned_user_id: int | None = None,
    q: str | None = None,
    db: Session = Depends(get_db),
):
    return work_order_service.list_work_orders(
        db=db,
        filter_by_status=[status.value for status in filter_by_status],
        start_date=start_date,
        work_order_id=work_order_id,
        assigned_user_id=assigned_user_id,
        q=q,
    )


@work_orders_router.post(
    "/work_orders",
    dependencies=[Depends(ScopedUser.WorkOrderCreate)],
    response_model=meter.WorkOrder,
    tags=["Work Orders"],
)
def create_work_order(
    new_work_order: meter.CreateWorkOrder,
    user: Users = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return work_order_service.create_work_order(
        db=db, user=user, new_work_order=new_work_order
    )


@work_orders_router.patch(
    "/work_orders",
    dependencies=[Depends(ScopedUser.WorkOrderUpdate)],
    response_model=meter.WorkOrder,
    tags=["Work Orders"],
)
def patch_work_order(
    patch_work_order_form: meter.PatchWorkOrder,
    user: Users = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return work_order_service.update_work_order(
        db=db, patch_work_order_form=patch_work_order_form, user=user
    )


@work_orders_router.delete(
    "/work_orders",
    dependencies=[Depends(ScopedUser.Admin)],
    tags=["Work Orders"],
)
def delete_work_order(
    work_order_id: int,
    user: Users = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return work_order_service.delete_work_order(
        db=db, user=user, work_order_id=work_order_id
    )
