from datetime import datetime
from collections import Counter

from fastapi import HTTPException
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload, undefer

from api.models.location import Locations
from api.models.meter import (
    ActivityTypeLU,
    MeterActivities,
    MeterObservations,
    MeterStatusLU,
    Meters,
    NoteTypeLU,
    ObservedPropertyTypeLU,
    ServiceTypeLU,
    Units,
)
from api.models.part import PartsUsed
from api.models.user import Users
from api.models.well import Wells
from api.schemas import meter
from api.services import storage as storage_service


def _get_hq_location(db: Session):
    return db.scalars(select(Locations).where(Locations.type_id == 1)).first()


async def create_activity(
    db: Session,
    activity_form: meter.ActivityForm,
    user: Users,
    photos,
    max_photos_per_meter: int,
):
    update_meter_state = True
    user_level = user.user_role.name

    last_activity = db.scalars(
        select(MeterActivities)
        .where(MeterActivities.meter_id == activity_form.activity_details.meter_id)
        .order_by(MeterActivities.timestamp_end.desc())
        .limit(1)
    ).first()

    activity_date = activity_form.activity_details.date.date()
    starttime = activity_form.activity_details.start_time.time().replace(second=0)
    endtime = activity_form.activity_details.end_time.time().replace(second=0)
    start_datetime = datetime.combine(activity_date, starttime)
    end_datetime = datetime.combine(activity_date, endtime)

    if last_activity and last_activity.timestamp_end > end_datetime:
        update_meter_state = False
        if user_level != "Admin":
            raise HTTPException(
                status_code=409,
                detail="Submitted activity is older than the last activity.",
            )

    activity_meter = db.scalars(
        select(Meters).where(activity_form.activity_details.meter_id == Meters.id)
    ).first()
    activity_type = db.scalars(
        select(ActivityTypeLU).where(
            activity_form.activity_details.activity_type_id == ActivityTypeLU.id
        )
    ).first()
    hq_location = _get_hq_location(db)

    activity_well = None
    if activity_form.current_installation.well_id:
        activity_well = db.scalars(
            select(Wells).where(activity_form.current_installation.well_id == Wells.id)
        ).first()
        activity_location = activity_well.location.id
    else:
        activity_location = hq_location.id

    meter_activity = MeterActivities(
        timestamp_start=start_datetime,
        timestamp_end=end_datetime,
        description=activity_form.maintenance_repair.description,
        submitting_user_id=activity_form.activity_details.user_id,
        meter_id=activity_form.activity_details.meter_id,
        activity_type_id=activity_form.activity_details.activity_type_id,
        location_id=activity_location,
        ose_share=activity_form.activity_details.share_ose,
        water_users=activity_form.current_installation.water_users,
    )
    if activity_form.activity_details.work_order_id:
        meter_activity.work_order_id = activity_form.activity_details.work_order_id

    try:
        db.add(meter_activity)
        db.commit()
        db.refresh(meter_activity)
    except IntegrityError:
        raise HTTPException(
            status_code=409, detail="Activity overlaps with existing activity."
        )

    db.flush()

    share_ose_observation = bool(activity_form.activity_details.share_ose)
    for observation_form in activity_form.observations:
        observation_datetime = datetime.combine(
            activity_date, observation_form.time.time()
        )
        db.add(
            MeterObservations(
                timestamp=observation_datetime,
                value=observation_form.reading,
                observed_property_type_id=observation_form.property_type_id,
                unit_id=observation_form.unit_id,
                submitting_user_id=activity_form.activity_details.user_id,
                meter_id=activity_form.activity_details.meter_id,
                location_id=activity_location,
                ose_share=share_ose_observation,
            )
        )

    notes = db.scalars(
        select(NoteTypeLU).where(NoteTypeLU.id.in_(activity_form.notes.selected_note_ids))
    ).all()
    meter_activity.notes = notes

    status_note_type = db.scalars(
        select(NoteTypeLU).where(
            NoteTypeLU.slug == activity_form.notes.working_on_arrival_slug
        )
    ).first()
    meter_activity.notes.append(status_note_type)

    part_counts = Counter(activity_form.part_used_ids)

    meter_activity.parts_used_links = [
        PartsUsed(part_id=part_id, count=count)
        for part_id, count in part_counts.items()
    ]

    services = db.scalars(
        select(ServiceTypeLU).where(
            ServiceTypeLU.id.in_(activity_form.maintenance_repair.service_type_ids)
        )
    ).all()
    meter_activity.services_performed = services

    db.commit()

    meter_statuses = {
        status.status_name: status.id for status in db.scalars(select(MeterStatusLU)).all()
    }
    if update_meter_state:
        if activity_type.name in ["Uninstall", "Uninstall and Hold"]:
            activity_meter.location_id = hq_location.id
            activity_meter.well_id = None
            activity_meter.water_users = None
            activity_meter.status_id = (
                meter_statuses["On Hold"]
                if activity_type.name == "Uninstall and Hold"
                else meter_statuses["Warehouse"]
            )
        if activity_type.name == "Install":
            activity_meter.well_id = activity_well.id
            activity_meter.location_id = activity_location
            activity_meter.status_id = meter_statuses["Installed"]
            activity_meter.water_users = activity_form.current_installation.water_users
        if activity_type.name == "Scrap":
            activity_meter.well_id = None
            activity_meter.location_id = None
            activity_meter.status_id = meter_statuses["Scrapped"]
            activity_meter.water_users = None
            activity_meter.meter_owner = None
        if activity_type.name == "Sell":
            activity_meter.well_id = None
            activity_meter.location_id = None
            activity_meter.status_id = meter_statuses["Sold"]
            activity_meter.water_users = None
            activity_meter.meter_owner = activity_form.current_installation.meter_owner
        if activity_type.name == "Change Water Users":
            activity_meter.water_users = activity_form.current_installation.water_users

        if activity_type.name != "Uninstall":
            activity_meter.contact_name = activity_form.current_installation.contact_name
            activity_meter.contact_phone = activity_form.current_installation.contact_phone
            activity_meter.notes = activity_form.current_installation.notes

    db.commit()

    if photos:
        await storage_service.save_activity_photos(
            db=db,
            meter_activity=meter_activity,
            photos=photos,
            max_photos_per_meter=max_photos_per_meter,
        )

    return meter_activity


def patch_activity(db: Session, patch_activity_form: meter.PatchActivity):
    activity = db.scalars(
        select(MeterActivities).where(
            MeterActivities.id == patch_activity_form.activity_id
        )
    ).first()

    activity.timestamp_start = patch_activity_form.timestamp_start
    activity.timestamp_end = patch_activity_form.timestamp_end
    activity.description = patch_activity_form.description
    activity.ose_share = patch_activity_form.ose_share
    activity.water_users = patch_activity_form.water_users
    activity.location_id = (
        _get_hq_location(db).id
        if patch_activity_form.location_id is None
        else patch_activity_form.location_id
    )

    delete_sql = text('DELETE FROM "Notes" WHERE meter_activity_id = :activity_id')
    db.execute(delete_sql, {"activity_id": patch_activity_form.activity_id})
    if patch_activity_form.note_ids:
        insert_sql = text(
            'INSERT INTO "Notes" (meter_activity_id, note_type_id) VALUES (:activity_id, :note_id)'
        )
        for note_id in patch_activity_form.note_ids:
            db.execute(
                insert_sql,
                {"activity_id": patch_activity_form.activity_id, "note_id": note_id},
            )

    delete_sql = text('DELETE FROM "PartsUsed" WHERE meter_activity_id = :activity_id')
    db.execute(delete_sql, {"activity_id": patch_activity_form.activity_id})
    if patch_activity_form.part_ids:
        insert_sql = text(
            'INSERT INTO "PartsUsed" (meter_activity_id, part_id) VALUES (:activity_id, :part_id)'
        )
        for part_id in patch_activity_form.part_ids:
            db.execute(
                insert_sql,
                {"activity_id": patch_activity_form.activity_id, "part_id": part_id},
            )

    delete_sql = text(
        'DELETE FROM "ServicesPerformed" WHERE meter_activity_id = :activity_id'
    )
    db.execute(delete_sql, {"activity_id": patch_activity_form.activity_id})
    if patch_activity_form.service_ids:
        insert_sql = text(
            'INSERT INTO "ServicesPerformed" (meter_activity_id, service_type_id) VALUES (:activity_id, :service_id)'
        )
        for service_id in patch_activity_form.service_ids:
            db.execute(
                insert_sql,
                {
                    "activity_id": patch_activity_form.activity_id,
                    "service_id": service_id,
                },
            )

    db.commit()
    return {"status": "success"}


def delete_activity(db: Session, activity_id: int):
    activity = db.scalars(
        select(MeterActivities).where(MeterActivities.id == activity_id)
    ).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found.")

    storage_service.delete_activity_photos(db, activity_id)
    for table_name in ["Notes", "ServicesPerformed", "PartsUsed"]:
        sql = text(f'DELETE FROM "{table_name}" WHERE meter_activity_id = :activity_id')
        db.execute(sql, {"activity_id": activity_id})

    db.delete(activity)
    db.commit()
    return {"status": "success"}


def patch_observation(
    db: Session, patch_observation_form: meter.PatchObservation
):
    observation = db.scalars(
        select(MeterObservations).where(
            MeterObservations.id == patch_observation_form.observation_id
        )
    ).first()

    observation.timestamp = patch_observation_form.timestamp
    observation.value = patch_observation_form.value
    observation.notes = patch_observation_form.notes
    observation.observed_property_type_id = (
        patch_observation_form.observed_property_type_id
    )
    observation.unit_id = patch_observation_form.unit_id
    observation.meter_id = patch_observation_form.meter_id
    observation.submitting_user_id = patch_observation_form.submitting_user_id
    observation.ose_share = patch_observation_form.ose_share
    observation.location_id = (
        _get_hq_location(db).id
        if patch_observation_form.location_id is None
        else patch_observation_form.location_id
    )

    db.commit()
    return {"status": "success"}


def delete_observation(db: Session, observation_id: int):
    observation = db.scalars(
        select(MeterObservations).where(MeterObservations.id == observation_id)
    ).first()
    if not observation:
        raise HTTPException(status_code=404, detail="Observation not found.")
    db.delete(observation)
    db.commit()
    return {"status": "success"}


def get_activity_types(db: Session, user: Users):
    if user.user_role.name not in ["Admin", "Technician"]:
        return []

    activities = db.scalars(select(ActivityTypeLU)).all()
    if user.user_role.name != "Admin":
        return [
            activity for activity in activities if activity.name not in ["Sell", "Scrap"]
        ]
    return activities


def get_users(db: Session):
    return db.scalars(
        select(Users).options(undefer(Users.user_role_id)).where(Users.disabled == False)
    ).all()


def get_units(db: Session):
    return db.scalars(select(Units)).all()


def get_observed_property_types(db: Session):
    return (
        db.scalars(
            select(ObservedPropertyTypeLU).options(joinedload(ObservedPropertyTypeLU.units))
        )
        .unique()
        .all()
    )


def get_service_types(db: Session):
    return db.scalars(select(ServiceTypeLU)).all()


def get_note_types(db: Session):
    return db.scalars(select(NoteTypeLU)).all()
