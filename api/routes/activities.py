from fastapi import Depends, APIRouter, Query, File, UploadFile, Form
from fastapi.exceptions import HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload, undefer
from sqlalchemy.exc import IntegrityError
from sqlalchemy import select, text, or_
from datetime import datetime
from typing import List, Annotated
from api import security
from api.schemas import meter_schemas
from api.models.main_models import (
    Meters,
    ObservedPropertyTypeLU,
    Parts,
    ActivityTypeLU,
    Units,
    MeterActivities,
    MeterActivityPhotos,
    MeterObservations,
    ServiceTypeLU,
    NoteTypeLU,
    Wells,
    Locations,
    MeterStatusLU,
    Users,
    workOrders,
    workOrderStatusLU,
)
from api.session import get_db
from api.security import get_current_user
from api.enums import ScopedUser, WorkOrderStatus
from pathlib import Path
from google.cloud import storage

import uuid
import json
import os

activity_router = APIRouter()
public_activity_router = APIRouter()

BUCKET_NAME = os.getenv("GCP_BUCKET_NAME", "")
PHOTO_PREFIX = os.getenv("GCP_PHOTO_PREFIX", "")

MAX_PHOTOS_PER_REQUEST = 2
MAX_PHOTOS_PER_METER = 6


@public_activity_router.get("/activities/{activity_id}/photos/{photo_file_name}")
async def get_activity_photo(
    activity_id: int,
    photo_file_name: str,
    db: Session = Depends(get_db),
):
    photo = (
        db.query(MeterActivityPhotos)
        .filter(
            MeterActivityPhotos.meter_activity_id == activity_id,
            MeterActivityPhotos.file_name == photo_file_name,
        )
        .first()
    )

    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found for this activity")

    try:
        client = storage.Client()
        bucket = client.bucket(BUCKET_NAME)
        blob = bucket.blob(photo.gcs_path)

        # Optional: ensure blob exists (avoids returning empty/500)
        if not blob.exists(client=client):
            raise HTTPException(
                status_code=404, detail="Photo file missing from storage"
            )

        # Pull content type from GCS metadata (fallback if absent)
        blob.reload(client=client)
        content_type = blob.content_type or "application/octet-stream"

        # 3) Stream back to client
        file_obj = blob.open("rb")  # streaming file-like object

        # Inline display; if you want download behavior change to 'attachment'
        headers = {"Content-Disposition": f'inline; filename="{photo.file_name}"'}

        return StreamingResponse(file_obj, media_type=content_type, headers=headers)

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to retrieve photo")


@activity_router.post(
    "/activities",
    response_model=meter_schemas.MeterActivity,
    dependencies=[Depends(ScopedUser.ActivityWrite)],
    tags=["Activities"],
)
async def post_activity(
    activity: str = Form(...),  # JSON string from FormData
    photos: list[UploadFile] = File(None),
    db: Session = Depends(get_db),
    user: Users = Depends(get_current_user),
):
    """
    Handles submission of an activity (with optional file uploads).
    """

    if photos:
        if len(photos) > MAX_PHOTOS_PER_REQUEST:
            raise HTTPException(
                status_code=400,
                detail=f"Too many photos uploaded. "
                f"Max {MAX_PHOTOS_PER_REQUEST} allowed per request, got {len(photos)}.",
            )

    try:
        activity_form = meter_schemas.ActivityForm.parse_obj(json.loads(activity))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid activity payload: {e}")

    # Set some variables that will be used to determine how the meter is updated
    update_meter_state = True
    user_level = user.user_role.name

    # First check that the date and time of the activity are newer than the last activity
    last_activity = db.scalars(
        select(MeterActivities)
        .where(MeterActivities.meter_id == activity_form.activity_details.meter_id)
        .order_by(MeterActivities.timestamp_end.desc())
        .limit(1)
    ).first()

    # Calculate event start and end datetimes
    activity_date = activity_form.activity_details.date.date()
    # Set the times to have 0 seconds, this prevents accidental duplicate activities
    starttime = activity_form.activity_details.start_time.time().replace(second=0)
    endtime = activity_form.activity_details.end_time.time().replace(second=0)
    start_datetime = datetime.combine(activity_date, starttime)
    end_datetime = datetime.combine(activity_date, endtime)

    if last_activity:
        if last_activity.timestamp_end > end_datetime:
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

    # Get the location of the activity based on the well associated with the meter
    # If there is no well, assume the activity took place at the "Warehouse"
    hq_location = db.scalars(
        select(Locations).where(Locations.type_id == 1)
    ).first()  # Probably needs a slug

    if activity_form.current_installation.well_id:
        activity_well = db.scalars(
            select(Wells).where(activity_form.current_installation.well_id == Wells.id)
        ).first()
        activity_location = activity_well.location.id
    else:
        activity_location = hq_location.id

    # ---- Create the activity itself ----
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

    # If a work order is associated with the activity, add it to the activity
    if activity_form.activity_details.work_order_id:
        meter_activity.work_order_id = activity_form.activity_details.work_order_id

    # Add the activity to the database and if it already exists raise an error
    try:
        db.add(meter_activity)
        db.commit()
        db.refresh(meter_activity)  # make sure meter_activity.id is available
    except IntegrityError as _e:
        raise HTTPException(
            status_code=409, detail="Activity overlaps with existing activity."
        )

    db.flush()

    # Create the observations
    if activity_form.activity_details.share_ose:
        # Set OSE flag in observation to true
        share_ose_observation = True
    else:
        share_ose_observation = False

    for observation_form in activity_form.observations:
        observation_time = observation_form.time.time()
        observation_datetime = datetime.combine(activity_date, observation_time)
        observation = MeterObservations(
            timestamp=observation_datetime,
            value=observation_form.reading,
            observed_property_type_id=observation_form.property_type_id,
            unit_id=observation_form.unit_id,
            submitting_user_id=activity_form.activity_details.user_id,
            meter_id=activity_form.activity_details.meter_id,
            location_id=activity_location,
            ose_share=share_ose_observation,
        )
        db.add(observation)

    # Associate notes
    notes = db.scalars(
        select(NoteTypeLU).where(
            NoteTypeLU.id.in_(activity_form.notes.selected_note_ids)
        )
    ).all()
    meter_activity.notes = notes

    # Associate working status note
    status_note_type = db.scalars(
        select(NoteTypeLU).where(
            NoteTypeLU.slug == activity_form.notes.working_on_arrival_slug
        )
    ).first()
    meter_activity.notes.append(status_note_type)

    # Associate and handle parts use
    used_parts = db.scalars(
        select(Parts).where(Parts.id.in_(activity_form.part_used_ids))
    ).all()
    meter_activity.parts_used = used_parts

    for used_part in used_parts:
        used_part.count -= 1

    # Associate services performed
    services = db.scalars(
        select(ServiceTypeLU).where(
            ServiceTypeLU.id.in_(activity_form.maintenance_repair.service_type_ids)
        )
    ).all()
    meter_activity.services_performed = services

    db.commit()

    # ---- Update the current state of the meter based on the activity type ----
    meter_statuses = db.scalars(select(MeterStatusLU)).all()
    meter_statuses = {status.status_name: status.id for status in meter_statuses}

    if update_meter_state:
        if (activity_type.name == "Uninstall") or (
            activity_type.name == "Uninstall and Hold"
        ):  # This needs to be a slug
            activity_meter.location_id = hq_location.id
            activity_meter.well_id = None
            activity_meter.water_users = None

            if activity_type.name == "Uninstall and Hold":
                # Set status as On Hold
                activity_meter.status_id = meter_statuses["On Hold"]
            else:
                # Set status as Uninstalled
                activity_meter.status_id = meter_statuses["Warehouse"]

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

        # Make updates to the meter based on user's entry in the current installation section
        if activity_type.name != "Uninstall":
            activity_meter.contact_name = (
                activity_form.current_installation.contact_name
            )
            activity_meter.contact_phone = (
                activity_form.current_installation.contact_phone
            )
            activity_meter.notes = activity_form.current_installation.notes

    db.commit()

    # ---- Handle photo file uploads ----
    if photos:
        print(f"Received {len(photos)} photos")
        print(f"Uploading to bucket={BUCKET_NAME}, prefix={PHOTO_PREFIX}")
        client = storage.Client()
        bucket = client.bucket(BUCKET_NAME)

        for file in photos:
            ext = Path(file.filename).suffix or ".jpg"
            unique_name = f"{uuid.uuid4()}{ext}"
            blob_path = f"{PHOTO_PREFIX}/{meter_activity.id}/{unique_name}"
            blob = bucket.blob(blob_path)

            # Upload file content directly
            try:
                contents = await file.read()
                print(f"Uploading {file.filename}, size={len(contents)} bytes")

                blob.upload_from_string(contents, content_type=file.content_type)
                print(f"Uploaded to gs://{BUCKET_NAME}/{blob_path}")
            except Exception as e:
                print(f"ERROR uploading {file.filename}: {e}")
                raise

            photo = MeterActivityPhotos(
                meter_activity_id=meter_activity.id,
                file_name=unique_name,
                gcs_path=blob_path,
            )
            db.add(photo)

        db.commit()
        print(f"Saved {len(photos)} photos for activity {meter_activity.id}")
        db.refresh(meter_activity)

        # ---- Enforce per-meter retention ----
        all_photos = (
            db.query(MeterActivityPhotos)
            .join(MeterActivities)
            .filter(MeterActivities.meter_id == meter_activity.meter_id)
            .order_by(MeterActivityPhotos.uploaded_at.desc())
            .all()
        )

        if len(all_photos) > MAX_PHOTOS_PER_METER:
            # keep newest MAX_PHOTOS_PER_METER, delete the rest
            to_delete = all_photos[MAX_PHOTOS_PER_METER:]
            for old_photo in to_delete:
                try:
                    bucket.blob(old_photo.gcs_path).delete()
                except Exception as e:
                    print(
                        f"Warning: failed to delete {old_photo.gcs_path} from GCS: {e}"
                    )
                db.delete(old_photo)

            db.commit()

    return meter_activity


@activity_router.patch(
    "/activities",
    dependencies=[Depends(ScopedUser.Admin)],
    tags=["Activities"],
)
def patch_activity(
    patch_activity_form: meter_schemas.PatchActivity, db: Session = Depends(get_db)
):
    """
    Patch an activity.
    All input times should be UTC
    """
    # Get the activity
    activity = db.scalars(
        select(MeterActivities).where(
            MeterActivities.id == patch_activity_form.activity_id
        )
    ).first()

    # Update the activity
    activity.timestamp_start = patch_activity_form.timestamp_start
    activity.timestamp_end = patch_activity_form.timestamp_end
    activity.description = patch_activity_form.description
    activity.ose_share = patch_activity_form.ose_share
    activity.water_users = patch_activity_form.water_users

    # When updating location, if location_id is null assume the activity took place at the "Warehouse"
    if patch_activity_form.location_id is None:
        hq_location = db.scalars(
            select(Locations).where(Locations.type_id == 1)
        ).first()
        activity.location_id = hq_location.id
    else:
        activity.location_id = patch_activity_form.location_id

    # Update the notes
    # Easiest approach is to just delete existing and then re-add if there are any
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

    # Update the parts used
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

    # Update the services performed
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

    # Commit the changes
    db.commit()

    return {"status": "success"}


@activity_router.delete(
    "/activities",
    dependencies=[Depends(ScopedUser.Admin)],
    tags=["Activities"],
)
def delete_activity(activity_id: int, db: Session = Depends(get_db)):
    """
    Deletes an activity.
    """
    # Get the activity
    activity = db.scalars(
        select(MeterActivities).where(MeterActivities.id == activity_id)
    ).first()

    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found.")

    photos = db.scalars(
        select(MeterActivityPhotos).where(
            MeterActivityPhotos.meter_activity_id == activity_id
        )
    ).all()

    storage_client = storage.Client()
    bucket = storage_client.bucket(BUCKET_NAME)

    for photo in photos:
        try:
            blob = bucket.blob(photo.gcs_path)
            blob.delete()
            print(f"Deleted GCS object: {photo.gcs_path}")
        except Exception as e:
            print(f"Failed to delete {photo.gcs_path} from bucket: {e}")

    # Delete any notes associated with the activity
    sql = text('DELETE FROM "Notes" WHERE meter_activity_id = :activity_id')
    db.execute(sql, {"activity_id": activity_id})

    # Delete any services performed associated with the activity
    sql = text('DELETE FROM "ServicesPerformed" WHERE meter_activity_id = :activity_id')
    db.execute(sql, {"activity_id": activity_id})

    # Delete any parts used associated with the activity
    sql = text('DELETE FROM "PartsUsed" WHERE meter_activity_id = :activity_id')
    db.execute(sql, {"activity_id": activity_id})

    # Delete the activity
    db.delete(activity)
    db.commit()

    return {"status": "success"}


@activity_router.patch(
    "/observations",
    dependencies=[Depends(ScopedUser.Admin)],
    tags=["Activities"],
)
def patch_observation(
    patch_observation_form: meter_schemas.PatchObservation,
    db: Session = Depends(get_db),
):
    """
    Patch an observation.
    All input times should be UTC
    """
    # Get the observation
    observation = db.scalars(
        select(MeterObservations).where(
            MeterObservations.id == patch_observation_form.observation_id
        )
    ).first()

    # Update the observation
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

    # When updating location, if location_id is null assume the observation took place at the "Warehouse"
    if patch_observation_form.location_id is None:
        hq_location = db.scalars(
            select(Locations).where(Locations.type_id == 1)
        ).first()
        observation.location_id = hq_location.id
    else:
        observation.location_id = patch_observation_form.location_id

    db.commit()

    return {"status": "success"}


@activity_router.delete(
    "/observations",
    dependencies=[Depends(ScopedUser.Admin)],
    tags=["Activities"],
)
def delete_observation(observation_id: int, db: Session = Depends(get_db)):
    """
    Deletes an observation.
    """
    # Get the observation
    observation = db.scalars(
        select(MeterObservations).where(MeterObservations.id == observation_id)
    ).first()

    # Return error if the observation doesn't exist
    if not observation:
        raise HTTPException(status_code=404, detail="Observation not found.")

    # Delete the observation
    db.delete(observation)
    db.commit()

    return {"status": "success"}


@activity_router.get(
    "/activity_types",
    response_model=List[meter_schemas.ActivityTypeLU],
    dependencies=[Depends(ScopedUser.Read)],
    tags=["Activities"],
)
def get_activity_types(
    db: Session = Depends(get_db), user: Users = Depends(get_current_user)
):
    """
    Only returns activity types approved for user type.
    """
    if user.user_role.name not in ["Admin", "Technician"]:
        return []
    else:
        activities = db.scalars(select(ActivityTypeLU)).all()
        if user.user_role.name != "Admin":
            return [
                activity
                for activity in activities
                if activity.name not in ["Sell", "Scrap"]
            ]

    return activities


@activity_router.get(
    "/users",
    dependencies=[Depends(ScopedUser.Read)],
    tags=["Activities"],
)
def get_users(db: Session = Depends(get_db)):
    return db.scalars(
        select(Users)
        .options(undefer(Users.user_role_id))
        .where(Users.disabled == False)
    ).all()


@activity_router.get(
    "/units",
    response_model=List[meter_schemas.Unit],
    dependencies=[Depends(ScopedUser.Read)],
    tags=["Activities"],
)
def get_units(db: Session = Depends(get_db)):
    return db.scalars(select(Units)).all()


@activity_router.get(
    "/observed_property_types",
    response_model=List[meter_schemas.ObservedPropertyTypeLU],
    dependencies=[Depends(ScopedUser.Read)],
    tags=["Activities"],
)
def get_observed_property_types(db: Session = Depends(get_db)):
    return (
        db.scalars(
            select(ObservedPropertyTypeLU).options(
                joinedload(ObservedPropertyTypeLU.units)
            )
        )
        .unique()
        .all()
    )


@activity_router.get(
    "/service_types",
    response_model=List[meter_schemas.ServiceTypeLU],
    dependencies=[Depends(ScopedUser.Read)],
    tags=["Activities"],
)
def get_service_types(db: Session = Depends(get_db)):
    return db.scalars(select(ServiceTypeLU)).all()


@activity_router.get(
    "/note_types",
    dependencies=[Depends(ScopedUser.Read)],
    tags=["Activities"],
)
def get_note_types(db: Session = Depends(get_db)):
    return db.scalars(select(NoteTypeLU)).all()


@activity_router.get(
    "/work_orders",
    dependencies=[Depends(ScopedUser.Read)],
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
    stmt = (
        select(workOrders)
        .options(
            joinedload(workOrders.status),
            joinedload(workOrders.meter),
            joinedload(workOrders.assigned_user),
        )
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

    work_orders = db.scalars(stmt).all()

    # grab activities separately
    relevant_activities = db.scalars(
        select(MeterActivities)
        .options(joinedload(MeterActivities.location))
        .where(MeterActivities.work_order_id.in_([wo.id for wo in work_orders]))
    ).all()

    # group activities by work_order_id
    activities_by_wo = {}
    for act in relevant_activities:
        activities_by_wo.setdefault(act.work_order_id, []).append(
            {
                "id": act.id,
                "timestamp_start": act.timestamp_start,
                "timestamp_end": act.timestamp_end,
                "description": act.description,
                "submitting_user_id": act.submitting_user_id,
                "meter_id": act.meter_id,
                "activity_type_id": act.activity_type_id,
                "location_id": act.location_id,
                "location_name": act.location.name if act.location else None,
                "ose_share": act.ose_share,
                "water_users": act.water_users,
            }
        )

    # build output
    output = []
    for wo in work_orders:
        output.append(
            {
                "work_order_id": wo.id,
                "ose_request_id": wo.ose_request_id,
                "date_created": wo.date_created,
                "creator": wo.creator,
                "meter_id": wo.meter.id,
                "meter_serial": wo.meter.serial_number,
                "title": wo.title,
                "description": wo.description,
                "status": wo.status.name,
                "notes": wo.notes,
                "assigned_user_id": wo.assigned_user_id,
                "assigned_user": wo.assigned_user.username
                if wo.assigned_user
                else None,
                "associated_activities": activities_by_wo.get(wo.id, []),
            }
        )

    return output


# Create work order endpoint
@activity_router.post(
    "/work_orders",
    dependencies=[Depends(ScopedUser.Admin)],
    response_model=meter_schemas.WorkOrder,
    tags=["Work Orders"],
)
def create_work_order(
    new_work_order: meter_schemas.CreateWorkOrder, db: Session = Depends(get_db)
):
    """
    Create a new work order dated to the current time.
    The only mandatory inputs are the date, meter ID, and the title of the work order.
    """
    # Get status ID Open
    open_status = db.scalars(
        select(workOrderStatusLU).where(workOrderStatusLU.name == "Open")
    ).first()

    # Create a new work order
    work_order = workOrders(
        date_created=new_work_order.date_created,
        meter_id=new_work_order.meter_id,
        title=new_work_order.title,
        status_id=open_status.id,
    )

    # Add optional fields if they exist
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

    # Commit the work order
    # Database should block empty title and non-unique (date, title, meter_id) combinations
    try:
        db.add(work_order)
        db.commit()
    except IntegrityError as _e:
        raise HTTPException(
            status_code=409, detail="Title empty or already exists for this meter."
        )

    # Create a WorkOrder schema for the updated work order
    work_order_schema = meter_schemas.WorkOrder(
        work_order_id=work_order.id,
        date_created=work_order.date_created,
        creator=work_order.creator,
        meter_id=work_order.meter.id,
        meter_serial=work_order.meter.serial_number,
        title=work_order.title,
        description=work_order.description,
        status=work_order.status.name,
        notes=work_order.notes,
        assigned_user_id=work_order.assigned_user_id,
        assigned_user=work_order.assigned_user.username
        if work_order.assigned_user
        else None,
    )

    return work_order_schema


# Patch work order endpoint
@activity_router.patch(
    "/work_orders",
    response_model=meter_schemas.WorkOrder,
    tags=["Work Orders"],
)
def patch_work_order(
    patch_work_order_form: meter_schemas.PatchWorkOrder,
    user: Users = Depends(security.get_current_user),
    db: Session = Depends(get_db),
):
    """
    Patch a work order.
    The input schema limits the fields that can be updated to the title, description, status, notes, and assigned user.
    This is to prevent confusion with other open work orders.
    """
    # Determine if update can be made by Tech
    comparison_work_order = meter_schemas.PatchWorkOrder(
        work_order_id=patch_work_order_form.work_order_id,
        status=patch_work_order_form.status,
        notes=patch_work_order_form.notes,
    )

    if comparison_work_order == patch_work_order_form:
        update_scope = "Technician"
    else:
        update_scope = "Admin"

    # Check if the user has the correct permissions to update the work order
    if user.user_role.name not in [update_scope, "Admin"]:
        raise HTTPException(
            status_code=403,
            detail="User does not have permission to update this work order.",
        )

    # Get the work order
    work_order = db.scalars(
        select(workOrders)
        .options(
            joinedload(workOrders.status),
            joinedload(workOrders.meter),
            joinedload(workOrders.assigned_user),
        )
        .where(workOrders.id == patch_work_order_form.work_order_id)
    ).first()

    # Ensure the current user is assigned the work order if they are a technician
    if user.user_role.name == "Technician":
        if work_order.assigned_user_id != user.id:
            raise HTTPException(
                status_code=403,
                detail="User does not have permission to update this work order.",
            )

    # An empty string for a title will silently fail due to the if statement below. Detect here and return an error to the user.
    if patch_work_order_form.title == "":
        raise HTTPException(status_code=422, detail="Title cannot be empty.")

    # Update the work order if the field exists
    if patch_work_order_form.title:
        work_order.title = patch_work_order_form.title
    if patch_work_order_form.description:
        work_order.description = patch_work_order_form.description
    if patch_work_order_form.status:
        # Get the status ID of the new status name
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

    # Commit the changes
    # Database should block empty title and non-unique (date, title, meter_id) combinations
    try:
        db.commit()
    except IntegrityError as _e:
        raise HTTPException(
            status_code=409, detail="Title already exists for this meter."
        )

    # Get the updated work order (needed by the frontend)
    work_order = db.scalars(
        select(workOrders)
        .options(
            joinedload(workOrders.status),
            joinedload(workOrders.meter),
            joinedload(workOrders.assigned_user),
        )
        .join(workOrderStatusLU)
        .where(workOrders.id == patch_work_order_form.work_order_id)
    ).first()

    # I was unable to get associated_activities to work with joinedload, so I'm doing it manually here
    associated_activities = db.scalars(
        select(MeterActivities).where(MeterActivities.work_order_id == work_order.id)
    ).all()

    # Create a WorkOrder schema for the updated work order
    work_order_schema = meter_schemas.WorkOrder(
        work_order_id=work_order.id,
        date_created=work_order.date_created,
        creator=work_order.creator,
        meter_id=work_order.meter.id,
        meter_serial=work_order.meter.serial_number,
        title=work_order.title,
        description=work_order.description,
        status=work_order.status.name,
        notes=work_order.notes,
        assigned_user_id=work_order.assigned_user_id,
        assigned_user=work_order.assigned_user.username
        if work_order.assigned_user
        else None,
        associated_activities=list(associated_activities),
    )

    return work_order_schema


# Delete work order endpoint
@activity_router.delete(
    "/work_orders",
    dependencies=[Depends(ScopedUser.Admin)],
    tags=["Work Orders"],
)
def delete_work_order(work_order_id: int, db: Session = Depends(get_db)):
    """
    Deletes a work order.
    """
    # Get the work order
    work_order = db.scalars(
        select(workOrders).where(workOrders.id == work_order_id)
    ).first()

    # Return error if the work order doesn't exist
    if not work_order:
        raise HTTPException(status_code=404, detail="Work order not found.")

    # Delete the work order
    db.delete(work_order)
    db.commit()

    return {"status": "success"}
