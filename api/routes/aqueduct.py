from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from api.auth.dependencies import ScopedUser
from api.models.location import Locations
from api.models.meter import ObservedPropertyTypeLU, Units
from api.models.user import Users
from api.models.well import WellMeasurements, Wells
from api.schemas import aqueduct
from api.security import get_current_user, missing_permissions_exception
from api.session import get_db


def require_aqueduct_service_account(
    current_user: Users = Depends(get_current_user),
) -> Users:
    """Restrict Aqueduct data exchange to Technician-role service accounts."""
    if (
        not current_user.is_service_account
        or current_user.user_role is None
        or current_user.user_role.name != "Technician"
    ):
        raise missing_permissions_exception
    return current_user


aqueduct_router = APIRouter(
    prefix="/aqueduct",
    dependencies=[
        Depends(ScopedUser.Read),
        Depends(require_aqueduct_service_account),
    ],
)


def _to_database_timestamp(timestamp: datetime) -> datetime:
    """Store comparisons use UTC-naive values, matching WellMeasurements.timestamp."""
    if timestamp.tzinfo is None:
        return timestamp
    return timestamp.astimezone(timezone.utc).replace(tzinfo=None)


@aqueduct_router.get(
    "/wells",
    response_model=list[aqueduct.AqueductWell],
    tags=["Aqueduct"],
)
def get_aqueduct_wells(db: Session = Depends(get_db)):
    statement = (
        select(
            Wells.id,
            Wells.name,
            Wells.total_depth,
            Locations.name.label("location_name"),
            Locations.latitude,
            Locations.longitude,
        )
        .outerjoin(Locations, Wells.location_id == Locations.id)
        .order_by(Wells.id)
    )
    return [dict(row) for row in db.execute(statement).mappings().all()]


@aqueduct_router.get(
    "/wells/{well_id}/measurements",
    response_model=list[aqueduct.AqueductMeasurement],
    tags=["Aqueduct"],
)
def get_aqueduct_measurements(
    well_id: int,
    start_timestamp: datetime = Query(
        ..., description="Inclusive ISO-8601 measurement timestamp lower bound"
    ),
    end_timestamp: datetime | None = Query(
        None, description="Inclusive ISO-8601 measurement timestamp upper bound"
    ),
    db: Session = Depends(get_db),
):
    start = _to_database_timestamp(start_timestamp)
    end = _to_database_timestamp(end_timestamp) if end_timestamp is not None else None

    if end is not None and end < start:
        raise HTTPException(
            status_code=422,
            detail="end_timestamp must be greater than or equal to start_timestamp",
        )

    if db.scalar(select(Wells.id).where(Wells.id == well_id)) is None:
        raise HTTPException(status_code=404, detail="Well not found")

    statement = (
        select(
            WellMeasurements.id,
            WellMeasurements.well_id,
            WellMeasurements.timestamp,
            WellMeasurements.value,
            ObservedPropertyTypeLU.name.label("observed_property_name"),
            ObservedPropertyTypeLU.description.label("observed_property_description"),
            ObservedPropertyTypeLU.context.label("observed_property_context"),
            Units.name.label("unit_name"),
            Units.name_short.label("unit_name_short"),
            Units.description.label("unit_description"),
        )
        .join(
            ObservedPropertyTypeLU,
            WellMeasurements.observed_property_id == ObservedPropertyTypeLU.id,
        )
        .join(Units, WellMeasurements.unit_id == Units.id)
        .where(
            WellMeasurements.well_id == well_id,
            WellMeasurements.timestamp >= start,
        )
        .order_by(WellMeasurements.timestamp, WellMeasurements.id)
    )

    if end is not None:
        statement = statement.where(WellMeasurements.timestamp <= end)

    return [dict(row) for row in db.execute(statement).mappings().all()]
