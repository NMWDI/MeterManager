from datetime import datetime, date, time

from pydantic import BaseModel, Field
from fastapi import Depends, APIRouter, HTTPException, Query
from sqlalchemy import select, and_
from sqlalchemy.orm import Session, joinedload, selectinload

from api.models.main_models import (
    Meters,
    MeterActivities,
    MeterObservations,
    Wells,
    meterRegisters,
    workOrders,
    ActivityTypeLU,
    ObservedPropertyTypeLU,
    ServiceTypeLU,
    NoteTypeLU,
    MeterStatusLU,
)

from api.schemas import meter_schemas
from api.session import get_db
from api.enums import ScopedUser

import os


API_BASE_URL = os.getenv("API_BASE_URL", "")


ose_router = APIRouter(dependencies=[Depends(ScopedUser.OSE)])


class MeterActivityPhotoDTO(BaseModel):
    name: str
    url: str


class ObservationDTO(BaseModel):
    observation_time: time  # Will be associated with a given activity
    observation_type: str
    measurement: float
    units: str


class ActivityDTO(BaseModel):
    activity_id: int
    ose_request_id: int | None = None
    activity_start: datetime
    activity_end: datetime
    activity_type: str
    well_ra_number: str | None
    well_ose_tag: str | None
    description: str
    services: list[str] = Field(default_factory=list)
    notes: list[str] = Field(default_factory=list)
    parts_used: list[str] = Field(default_factory=list)
    observations: list[ObservationDTO] = Field(default_factory=list)
    meter_activity_photos: list[MeterActivityPhotoDTO] = Field(default_factory=list)


class MeterHistoryDTO(BaseModel):
    serial_number: str
    activities: list[ActivityDTO] = Field(default_factory=list)


class DateHistoryDTO(BaseModel):
    date: date
    meters: list[MeterHistoryDTO] = []


class DisapprovalStatus(BaseModel):
    """
    Returns the status of a disapproval request and response
    """

    ose_request_id: int
    status: str
    notes: str | None = None
    disapproval_activity: ActivityDTO | None = None
    new_activities: list[ActivityDTO] | None = None


def build_activity_photo_url(activity_id: int, photo_name: str) -> str:
    return f"{API_BASE_URL}/activities/{activity_id}/photos/{photo_name}"


def getObservations(
    activity_start: datetime,
    activity_end: datetime,
    meter_id: int,
    observations: list[MeterObservations],
) -> list[ObservationDTO]:
    """
    A function to return a list of observations that occurred during a given activity
    """
    observations_list = []
    for observation in observations:
        if (
            observation.timestamp >= activity_start
            and observation.timestamp <= activity_end
            and observation.meter_id == meter_id
        ):
            observation = ObservationDTO(
                observation_time=observation.timestamp.time(),
                observation_type=observation.observed_property.name,
                measurement=observation.value,
                units=observation.unit.name_short,
            )
            observations_list.append(observation)

    return observations_list


def reorganizeHistory(
    activities: list[MeterActivities], observations: list[MeterObservations]
) -> list[DateHistoryDTO]:
    """
    A function to reorganize the data into the desired format for OSE history
    """
    # Reorganize the data into dictionaries mapping date and meter serial number to activities history{date: {meter: [activities]}}
    history = {}
    for activity in activities:
        date = activity.timestamp_start.strftime("%Y-%m-%d")
        meter = activity.meter.serial_number

        if date not in history:
            history[date] = {}

        if meter not in history[date]:
            history[date][meter] = []

        history[date][meter].append(activity)

    # Build the output list of DateHistoryDTO objects from the history dictionary
    history_list = []
    for date, meters in history.items():
        meter_history_list = []
        for meter, activities in meters.items():
            meter_activity_list = []
            for activity in activities:
                notes_strings = list(map(lambda note: note.note, activity.notes))
                parts_used_strings = list(
                    map(
                        lambda part: f"{part.part_type.name} ({part.part_number})",
                        activity.parts_used,
                    )
                )
                services_performed_strings = list(
                    map(
                        lambda service: service.service_name,
                        activity.services_performed,
                    )
                )
                activity_observations = getObservations(
                    activity.timestamp_start,
                    activity.timestamp_end,
                    activity.meter_id,
                    observations,
                )

                # Some activities are not associated with a well
                # If well is none, set the well's RA number and OSE tag to None
                if not activity.well:
                    ra_number = None
                    ose_tag = None
                else:
                    ra_number = activity.well.ra_number
                    ose_tag = activity.well.osetag

                meter_activity_photos = [
                    MeterActivityPhotoDTO(
                        name=p.file_name,
                        url=build_activity_photo_url(activity.id, p.file_name),
                    )
                    for p in (activity.photos or [])
                ]

                activity = ActivityDTO(
                    activity_id=activity.id,
                    ose_request_id=activity.work_order.ose_request_id
                    if activity.work_order
                    else None,
                    activity_type=activity.activity_type.name,
                    activity_start=activity.timestamp_start,
                    activity_end=activity.timestamp_end,
                    well_ra_number=ra_number,
                    well_ose_tag=ose_tag,
                    description=activity.description,
                    services=services_performed_strings,
                    notes=notes_strings,
                    parts_used=parts_used_strings,
                    observations=activity_observations,
                    meter_activity_photos=meter_activity_photos,
                )
                meter_activity_list.append(activity)

            meter_history = MeterHistoryDTO(
                serial_number=meter, activities=meter_activity_list
            )
            meter_history_list.append(meter_history)

        date_history = DateHistoryDTO(date=date, meters=meter_history_list)
        history_list.append(date_history)

    return history_list


@ose_router.get(
    "/shared_meter_maintenance_history",
    response_model=list[DateHistoryDTO],
    tags=["OSE"],
)
def get_shared_history(
    start_datetime: datetime, end_datetime: datetime, db: Session = Depends(get_db)
):
    """
    Returns activities and meter readings for each OSE well over input date range.

    Datetime Format ISO8601: YYYY-MM-DDTHH:MM:SS+HH:MM, example 2023-09-12T00:00:00+00:00
    """

    # Get all activities in the date range
    activities = (
        db.scalars(
            select(MeterActivities)
            .options(
                joinedload(MeterActivities.activity_type),
                joinedload(MeterActivities.parts_used),
                joinedload(MeterActivities.meter),
                joinedload(MeterActivities.work_order),
                joinedload(MeterActivities.well),
                selectinload(MeterActivities.photos),
            )
            .filter(
                and_(
                    MeterActivities.timestamp_end >= start_datetime,
                    MeterActivities.timestamp_end <= end_datetime,
                    MeterActivities.ose_share == True,
                )
            )
        )
        .unique()
        .all()
    )

    # Get all observations in the date range
    observations = (
        db.scalars(
            select(MeterObservations)
            .options(
                joinedload(MeterObservations.observed_property),
                joinedload(MeterObservations.unit),
                joinedload(MeterObservations.meter),
            )
            .filter(
                and_(
                    MeterObservations.timestamp >= start_datetime,
                    MeterObservations.timestamp <= end_datetime,
                    MeterObservations.ose_share == True,
                )
            )
        )
        .unique()
        .all()
    )

    # Store results in list so we can iterate over it multiple times (as opposed to using the SQLAlchemy cursor)
    activities_list = list(activities)
    observations_list = list(observations)

    return reorganizeHistory(activities_list, observations_list)


@ose_router.get(
    "/meter_maintenance_by_ose_request_id",
    response_model=list[DateHistoryDTO],
    tags=["OSE"],
)
def get_ose_maintenance_by_requestID(
    ose_request_ids: list[int] = Query(None), db: Session = Depends(get_db)
):
    """
    Returns activities and meter readings for each OSE well associated with a given OSE request ID.
    """

    # Get all activities in the date range
    activities = (
        db.scalars(
            select(MeterActivities)
            .options(
                joinedload(MeterActivities.activity_type),
                joinedload(MeterActivities.parts_used),
                joinedload(MeterActivities.meter).joinedload(Meters.well),
                joinedload(MeterActivities.work_order),
            )
            .join(workOrders)
            .where(
                and_(
                    workOrders.ose_request_id.in_(ose_request_ids),
                    MeterActivities.ose_share == True,
                )
            )
        )
        .unique()
        .all()
    )

    # Convert activities to a list so we can iterate over it multiple times (as opposed to using the SQLAlchemy cursor)
    activities_list = list(activities)

    if not activities_list:
        return []

    # Since observations do no include the OSE request ID, figure out what observations are associated with the activities using a date range
    activities_start_date = min(
        [activity.timestamp_start for activity in activities_list]
    )
    activities_end_date = max([activity.timestamp_end for activity in activities_list])

    # Get all observations in the date range
    observations = (
        db.scalars(
            select(MeterObservations)
            .options(
                joinedload(MeterObservations.observed_property),
                joinedload(MeterObservations.unit),
                joinedload(MeterObservations.meter),
            )
            .filter(
                and_(
                    MeterObservations.timestamp >= activities_start_date,
                    MeterObservations.timestamp <= activities_end_date,
                    MeterObservations.ose_share == True,
                )
            )
        )
        .unique()
        .all()
    )

    # Store results in list so we can iterate over it multiple times (as opposed to using the SQLAlchemy cursor)
    observations_list = list(observations)

    return reorganizeHistory(activities_list, observations_list)


@ose_router.get(
    "/meter_information",
    tags=["OSE"],
    response_model=meter_schemas.PublicMeter,
)
def get_meter_information(
    serial_number: str,
    db: Session = Depends(get_db),
):
    # Create the basic query
    query = select(Meters).options(
        joinedload(Meters.meter_type),
        joinedload(Meters.well).joinedload(Wells.location),
        joinedload(Meters.status),
        joinedload(Meters.meter_register).joinedload(meterRegisters.dial_units),
        joinedload(Meters.meter_register).joinedload(meterRegisters.totalizer_units),
    )

    query = query.filter(Meters.serial_number == serial_number)

    # Execute the query
    meter = db.scalars(query).first()

    if not meter:
        raise HTTPException(status_code=404, detail="Meter not found")

    # Manually create the response model because the object and response are organized differently
    output_meter = meter_schemas.PublicMeter(
        serial_number=meter.serial_number,
        status=meter.status.status_name,
        well=meter_schemas.PublicMeter.PublicWell(
            ra_number=meter.well.ra_number,
            osetag=meter.well.osetag,
            trss=meter.well.location.trss,
            longitude=meter.well.location.longitude,
            latitude=meter.well.location.latitude,
        )
        if meter.well
        else None,
        notes=meter.notes,
        meter_type=meter_schemas.PublicMeter.MeterType(
            brand=meter.meter_type.brand,
            model=meter.meter_type.model,
            size=meter.meter_type.size,
        ),
        meter_register=meter_schemas.PublicMeter.MeterRegister(
            ratio=meter.meter_register.ratio,
            number_of_digits=meter.meter_register.number_of_digits,
            decimal_digits=meter.meter_register.decimal_digits,
            dial_units=meter.meter_register.dial_units.name,
            totalizer_units=meter.meter_register.totalizer_units.name,
            multiplier=meter.meter_register.multiplier,
        )
        if meter.meter_register
        else None,
    )

    return output_meter


@ose_router.get(
    "/disapproval_response_by_request_id",
    tags=["OSE"],
    response_model=DisapprovalStatus,
)
def get_disapproval_response_by_request_id(
    ose_request_id: int, db: Session = Depends(get_db)
):
    # Get the work order associated with the OSE request ID
    work_order = db.scalars(
        select(workOrders)
        .options(joinedload(workOrders.status))
        .where(workOrders.ose_request_id == ose_request_id)
    ).first()

    # Check if work order is a disapproval as determined by title "OSE Data Issue"
    isDisapproval = work_order.title[:14] == "OSE Data Issue"

    if not work_order or not isDisapproval:
        raise HTTPException(status_code=404, detail="Work order not found")

    # Get the activity that was originally disapproved of
    # Not yet implemented return dummy ActivityDTO
    disapproval_activity = ActivityDTO(
        activity_id=99999,
        activity_type="Disapproval",
        activity_start=datetime.now(),
        activity_end=datetime.now(),
        well_ra_number=None,
        well_ose_tag=None,
        description="Not yet implemented, need activity ID in disapproval",
        services=[],
        notes=[],
        parts_used=[],
        observations=[],
    )

    # Get any new activities that are associated with the disapproval work order
    new_activities = (
        db.scalars(
            select(MeterActivities)
            .options(
                joinedload(MeterActivities.activity_type),
                joinedload(MeterActivities.parts_used),
                joinedload(MeterActivities.meter).joinedload(Meters.well),
                joinedload(MeterActivities.work_order),
            )
            .where(MeterActivities.work_order_id == work_order.id)
        )
        .unique()
        .all()
    )

    # Loop through the new activities and create the ActivityDTO objects
    # I also get observations for each activity, which might not be too performant
    # but there will likely only be one new activity if any
    new_activitiesDTO = []
    for na in new_activities:
        notes_strings = list(map(lambda note: note.note, na.notes))
        parts_used_strings = list(
            map(
                lambda part: f"{part.part_type.name} ({part.part_number})",
                na.parts_used,
            )
        )
        services_performed_strings = list(
            map(
                lambda service: service.service_name,
                na.services_performed,
            )
        )

        # Get observations for the meter in the time range of the activity
        observations = (
            db.scalars(
                select(MeterObservations)
                .options(
                    joinedload(MeterObservations.observed_property),
                    joinedload(MeterObservations.unit),
                )
                .filter(
                    and_(
                        MeterObservations.timestamp >= na.timestamp_start,
                        MeterObservations.timestamp <= na.timestamp_end,
                        MeterObservations.meter_id == na.meter_id,
                        MeterObservations.ose_share == True,
                    )
                )
            )
            .unique()
            .all()
        )

        # Create the observation DTOs
        activity_observations = []
        for observation in observations:
            observation = ObservationDTO(
                observation_time=observation.timestamp.time(),
                observation_type=observation.observed_property.name,
                measurement=observation.value,
                units=observation.unit.name_short,
            )
            activity_observations.append(observation)

        activity = ActivityDTO(
            activity_id=na.id,
            ose_request_id=na.work_order.ose_request_id if na.work_order else None,
            activity_type=na.activity_type.name,
            activity_start=na.timestamp_start,
            activity_end=na.timestamp_end,
            well_ra_number=na.meter.well.ra_number if na.meter.well else None,
            well_ose_tag=na.meter.well.osetag if na.meter.well else None,
            description=na.description,
            services=services_performed_strings,
            notes=notes_strings,
            parts_used=parts_used_strings,
            observations=activity_observations,
        )
        new_activitiesDTO.append(activity)

    # Create the response model
    response = DisapprovalStatus(
        ose_request_id=work_order.ose_request_id,
        status=work_order.status.name,
        notes=work_order.notes,
        disapproval_activity=disapproval_activity,
        new_activities=new_activitiesDTO,
    )

    return response


@ose_router.get(
    "/get_DB_types", tags=["OSE"], response_model=meter_schemas.DBTypesForOSE
)
def get_DB_types(db: Session = Depends(get_db)):
    """
    Return DB types from lookup tables
    """
    # Load all the lookup tables
    activity_types = db.scalars(select(ActivityTypeLU)).all()
    observed_property_types = db.scalars(select(ObservedPropertyTypeLU)).all()
    service_types = db.scalars(select(ServiceTypeLU)).all()
    note_types = db.scalars(select(NoteTypeLU)).all()
    meter_status_types = db.scalars(select(MeterStatusLU)).all()

    # Convert to
    activity_types = list(
        map(
            lambda x: meter_schemas.DBTypesForOSE.GeneralTypeInfo(
                name=x.name, description=x.description
            ),
            activity_types,
        )
    )
    observed_property_types = list(
        map(
            lambda x: meter_schemas.DBTypesForOSE.GeneralTypeInfo(
                name=x.name, description=x.description
            ),
            observed_property_types,
        )
    )
    service_types = list(
        map(
            lambda x: meter_schemas.DBTypesForOSE.GeneralTypeInfo(
                name=x.service_name, description=x.description
            ),
            service_types,
        )
    )
    note_types = list(
        map(
            lambda x: meter_schemas.DBTypesForOSE.GeneralTypeInfo(
                name=x.note, description=x.details
            ),
            note_types,
        )
    )
    meter_status_types = list(
        map(
            lambda x: meter_schemas.DBTypesForOSE.GeneralTypeInfo(
                name=x.status_name, description=x.description
            ),
            meter_status_types,
        )
    )

    # Create the response model
    response = meter_schemas.DBTypesForOSE(
        activity_types=activity_types,
        observed_property_types=observed_property_types,
        service_types=service_types,
        note_types=note_types,
        meter_status_types=meter_status_types,
    )

    return response
