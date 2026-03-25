from datetime import datetime
import os

from fastapi import HTTPException
from sqlalchemy import and_, select
from sqlalchemy.orm import Session, joinedload, selectinload

from api.models.meter import (
    ActivityTypeLU,
    MeterActivities,
    MeterObservations,
    MeterStatusLU,
    Meters,
    NoteTypeLU,
    ObservedPropertyTypeLU,
    ServiceTypeLU,
    meterRegisters,
)
from api.models.well import Wells
from api.models.work_order import workOrders
from api.schemas import meter, ose


API_BASE_URL = os.getenv("API_BASE_URL", "")


def build_activity_photo_url(activity_id: int, photo_name: str) -> str:
    return f"{API_BASE_URL}/activities/{activity_id}/photos/{photo_name}"


def _get_observations_for_activity(
    activity_start: datetime,
    activity_end: datetime,
    meter_id: int,
    observations: list[MeterObservations],
) -> list[ose.ObservationDTO]:
    observation_list = []
    for observation in observations:
        if (
            observation.timestamp >= activity_start
            and observation.timestamp <= activity_end
            and observation.meter_id == meter_id
        ):
            observation_list.append(
                ose.ObservationDTO(
                    observation_time=observation.timestamp.time(),
                    observation_type=observation.observed_property.name,
                    measurement=observation.value,
                    units=observation.unit.name_short,
                )
            )
    return observation_list


def _serialize_activity(
    activity: MeterActivities, observations: list[MeterObservations]
) -> ose.ActivityDTO:
    notes_strings = [note.note for note in activity.notes]
    parts_used_strings = [
        f"{part.part_type.name} ({part.part_number})" for part in activity.parts_used_links
    ]
    services_performed_strings = [
        service.service_name for service in activity.services_performed
    ]
    activity_observations = _get_observations_for_activity(
        activity.timestamp_start,
        activity.timestamp_end,
        activity.meter_id,
        observations,
    )
    well_ra_number = activity.well.ra_number if activity.well else None
    well_ose_tag = activity.well.osetag if activity.well else None
    meter_activity_photos = [
        ose.MeterActivityPhotoDTO(
            name=photo.file_name,
            url=build_activity_photo_url(activity.id, photo.file_name),
        )
        for photo in (activity.photos or [])
    ]

    return ose.ActivityDTO(
        activity_id=activity.id,
        ose_request_id=activity.work_order.ose_request_id if activity.work_order else None,
        activity_type=activity.activity_type.name,
        activity_start=activity.timestamp_start,
        activity_end=activity.timestamp_end,
        well_ra_number=well_ra_number,
        well_ose_tag=well_ose_tag,
        description=activity.description,
        services=services_performed_strings,
        notes=notes_strings,
        parts_used=parts_used_strings,
        observations=activity_observations,
        meter_activity_photos=meter_activity_photos,
    )


def reorganize_history(
    activities: list[MeterActivities], observations: list[MeterObservations]
) -> list[ose.DateHistoryDTO]:
    history: dict[str, dict[str, list[MeterActivities]]] = {}
    for activity in activities:
        activity_date = activity.timestamp_start.strftime("%Y-%m-%d")
        meter_serial = activity.meter.serial_number
        history.setdefault(activity_date, {}).setdefault(meter_serial, []).append(activity)

    history_list: list[ose.DateHistoryDTO] = []
    for activity_date, meters in history.items():
        meter_history_list = []
        for meter_serial, meter_activities in meters.items():
            meter_history_list.append(
                ose.MeterHistoryDTO(
                    serial_number=meter_serial,
                    activities=[
                        _serialize_activity(activity, observations)
                        for activity in meter_activities
                    ],
                )
            )
        history_list.append(
            ose.DateHistoryDTO(date=activity_date, meters=meter_history_list)
        )

    return history_list


def get_shared_history(
    db: Session, start_datetime: datetime, end_datetime: datetime
) -> list[ose.DateHistoryDTO]:
    activities = (
        db.scalars(
            select(MeterActivities)
            .options(
                joinedload(MeterActivities.activity_type),
                joinedload(MeterActivities.parts_used_links),
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

    return reorganize_history(list(activities), list(observations))


def get_maintenance_by_request_ids(
    db: Session, ose_request_ids: list[int] | None
) -> list[ose.DateHistoryDTO]:
    activities = (
        db.scalars(
            select(MeterActivities)
            .options(
                joinedload(MeterActivities.activity_type),
                joinedload(MeterActivities.parts_used),
                joinedload(MeterActivities.meter).joinedload(Meters.well),
                joinedload(MeterActivities.work_order),
                selectinload(MeterActivities.photos),
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

    activities_list = list(activities)
    if not activities_list:
        return []

    activities_start_date = min(activity.timestamp_start for activity in activities_list)
    activities_end_date = max(activity.timestamp_end for activity in activities_list)
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

    return reorganize_history(activities_list, list(observations))


def get_meter_information(db: Session, serial_number: str) -> meter.PublicMeter:
    query = select(Meters).options(
        joinedload(Meters.meter_type),
        joinedload(Meters.well).joinedload(Wells.location),
        joinedload(Meters.status),
        joinedload(Meters.meter_register).joinedload(meterRegisters.dial_units),
        joinedload(Meters.meter_register).joinedload(meterRegisters.totalizer_units),
    )
    meter = db.scalars(query.filter(Meters.serial_number == serial_number)).first()

    if not meter:
        raise HTTPException(status_code=404, detail="Meter not found")

    return meter.PublicMeter(
        serial_number=meter.serial_number,
        status=meter.status.status_name,
        well=meter.PublicMeter.PublicWell(
            ra_number=meter.well.ra_number,
            osetag=meter.well.osetag,
            trss=meter.well.location.trss,
            longitude=meter.well.location.longitude,
            latitude=meter.well.location.latitude,
        )
        if meter.well
        else None,
        notes=meter.notes,
        meter_type=meter.PublicMeter.MeterType(
            brand=meter.meter_type.brand,
            model=meter.meter_type.model,
            size=meter.meter_type.size,
        ),
        meter_register=meter.PublicMeter.MeterRegister(
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


def get_disapproval_response(
    db: Session, ose_request_id: int
) -> ose.DisapprovalStatus:
    work_order = db.scalars(
        select(workOrders)
        .options(joinedload(workOrders.status))
        .where(workOrders.ose_request_id == ose_request_id)
    ).first()

    if not work_order or not work_order.title.startswith("OSE Data Issue"):
        raise HTTPException(status_code=404, detail="Work order not found")

    disapproval_activity = ose.ActivityDTO(
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

    new_activities = (
        db.scalars(
            select(MeterActivities)
            .options(
                joinedload(MeterActivities.activity_type),
                joinedload(MeterActivities.parts_used),
                joinedload(MeterActivities.meter).joinedload(Meters.well),
                joinedload(MeterActivities.work_order),
                selectinload(MeterActivities.photos),
            )
            .where(MeterActivities.work_order_id == work_order.id)
        )
        .unique()
        .all()
    )

    new_activities_dto = []
    for activity in new_activities:
        observations = (
            db.scalars(
                select(MeterObservations)
                .options(
                    joinedload(MeterObservations.observed_property),
                    joinedload(MeterObservations.unit),
                )
                .filter(
                    and_(
                        MeterObservations.timestamp >= activity.timestamp_start,
                        MeterObservations.timestamp <= activity.timestamp_end,
                        MeterObservations.meter_id == activity.meter_id,
                        MeterObservations.ose_share == True,
                    )
                )
            )
            .unique()
            .all()
        )
        new_activities_dto.append(_serialize_activity(activity, list(observations)))

    return ose.DisapprovalStatus(
        ose_request_id=work_order.ose_request_id,
        status=work_order.status.name,
        notes=work_order.notes,
        disapproval_activity=disapproval_activity,
        new_activities=new_activities_dto,
    )


def get_db_types(db: Session) -> meter.DBTypesForOSE:
    return meter.DBTypesForOSE(
        activity_types=[
            meter.DBTypesForOSE.GeneralTypeInfo(
                name=item.name, description=item.description
            )
            for item in db.scalars(select(ActivityTypeLU)).all()
        ],
        observed_property_types=[
            meter.DBTypesForOSE.GeneralTypeInfo(
                name=item.name, description=item.description
            )
            for item in db.scalars(select(ObservedPropertyTypeLU)).all()
        ],
        service_types=[
            meter.DBTypesForOSE.GeneralTypeInfo(
                name=item.service_name, description=item.description
            )
            for item in db.scalars(select(ServiceTypeLU)).all()
        ],
        note_types=[
            meter.DBTypesForOSE.GeneralTypeInfo(
                name=item.note, description=item.details
            )
            for item in db.scalars(select(NoteTypeLU)).all()
        ],
        meter_status_types=[
            meter.DBTypesForOSE.GeneralTypeInfo(
                name=item.status_name, description=item.description
            )
            for item in db.scalars(select(MeterStatusLU)).all()
        ],
    )
