from datetime import datetime

from fastapi import Depends, APIRouter, Query
from sqlalchemy.orm import Session

from api.schemas import meter, ose
from api.session import get_db
from api.auth.dependencies import ScopedUser
from api.services import ose as ose_service


ose_router = APIRouter(dependencies=[Depends(ScopedUser.OSE)])


@ose_router.get(
    "/shared_meter_maintenance_history",
    response_model=list[ose.DateHistoryDTO],
    tags=["OSE"],
)
def get_shared_history(
    start_datetime: datetime, end_datetime: datetime, db: Session = Depends(get_db)
):
    """
    Returns activities and meter readings for each OSE well over input date range.

    Datetime Format ISO8601: YYYY-MM-DDTHH:MM:SS+HH:MM, example 2023-09-12T00:00:00+00:00
    """

    return ose_service.get_shared_history(db, start_datetime, end_datetime)


@ose_router.get(
    "/meter_maintenance_by_ose_request_id",
    response_model=list[ose.DateHistoryDTO],
    tags=["OSE"],
)
def get_ose_maintenance_by_requestID(
    ose_request_ids: list[int] = Query(None), db: Session = Depends(get_db)
):
    """
    Returns activities and meter readings for each OSE well associated with a given OSE request ID.
    """

    return ose_service.get_maintenance_by_request_ids(db, ose_request_ids)


@ose_router.get(
    "/meter_information",
    tags=["OSE"],
    response_model=meter.PublicMeter,
)
def get_meter_information(
    serial_number: str,
    db: Session = Depends(get_db),
):
    return ose_service.get_meter_information(db, serial_number)


@ose_router.get(
    "/disapproval_response_by_request_id",
    tags=["OSE"],
    response_model=ose.DisapprovalStatus,
)
def get_disapproval_response_by_request_id(
    ose_request_id: int, db: Session = Depends(get_db)
):
    return ose_service.get_disapproval_response(db, ose_request_id)


@ose_router.get("/get_DB_types", tags=["OSE"], response_model=meter.DBTypesForOSE)
def get_DB_types(db: Session = Depends(get_db)):
    """
    Return DB types from lookup tables
    """
    return ose_service.get_db_types(db)
