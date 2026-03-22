from fastapi import Depends, APIRouter, File, UploadFile, Form
from fastapi.exceptions import HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List
from api.schemas import meter
from api.models.user import Users
from api.session import get_db
from api.security import get_current_user
from api.services import activities as activity_service
from api.services import storage as storage_service
from api.auth.dependencies import ScopedUser

import json

activity_router = APIRouter()
public_activity_router = APIRouter()

MAX_PHOTOS_PER_REQUEST = 2
MAX_PHOTOS_PER_METER = 6


@public_activity_router.get("/activities/{activity_id}/photos/{photo_file_name}")
async def get_activity_photo(
    activity_id: int,
    photo_file_name: str,
    db: Session = Depends(get_db),
):
    photo = storage_service.get_activity_photo_record(db, activity_id, photo_file_name)
    file_obj, content_type, headers = storage_service.open_activity_photo(photo)
    return StreamingResponse(file_obj, media_type=content_type, headers=headers)


@activity_router.post(
    "/activities",
    response_model=meter.MeterActivity,
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
        activity_form = meter.ActivityForm.parse_obj(json.loads(activity))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid activity payload: {e}")

    return await activity_service.create_activity(
        db=db,
        activity_form=activity_form,
        user=user,
        photos=photos,
        max_photos_per_meter=MAX_PHOTOS_PER_METER,
    )


@activity_router.patch(
    "/activities",
    dependencies=[Depends(ScopedUser.Admin)],
    tags=["Activities"],
)
def patch_activity(
    patch_activity_form: meter.PatchActivity, db: Session = Depends(get_db)
):
    return activity_service.patch_activity(db, patch_activity_form)


@activity_router.delete(
    "/activities",
    dependencies=[Depends(ScopedUser.Admin)],
    tags=["Activities"],
)
def delete_activity(activity_id: int, db: Session = Depends(get_db)):
    return activity_service.delete_activity(db, activity_id)


@activity_router.patch(
    "/observations",
    dependencies=[Depends(ScopedUser.Admin)],
    tags=["Activities"],
)
def patch_observation(
    patch_observation_form: meter.PatchObservation,
    db: Session = Depends(get_db),
):
    return activity_service.patch_observation(db, patch_observation_form)


@activity_router.delete(
    "/observations",
    dependencies=[Depends(ScopedUser.Admin)],
    tags=["Activities"],
)
def delete_observation(observation_id: int, db: Session = Depends(get_db)):
    return activity_service.delete_observation(db, observation_id)


@activity_router.get(
    "/activity_types",
    response_model=List[meter.ActivityTypeLU],
    dependencies=[Depends(ScopedUser.Read)],
    tags=["Activities"],
)
def get_activity_types(
    db: Session = Depends(get_db), user: Users = Depends(get_current_user)
):
    return activity_service.get_activity_types(db, user)


@activity_router.get(
    "/users",
    dependencies=[Depends(ScopedUser.Read)],
    tags=["Activities"],
)
def get_users(db: Session = Depends(get_db)):
    return activity_service.get_users(db)


@activity_router.get(
    "/units",
    response_model=List[meter.Unit],
    dependencies=[Depends(ScopedUser.Read)],
    tags=["Activities"],
)
def get_units(db: Session = Depends(get_db)):
    return activity_service.get_units(db)


@activity_router.get(
    "/observed_property_types",
    response_model=List[meter.ObservedPropertyTypeLU],
    dependencies=[Depends(ScopedUser.Read)],
    tags=["Activities"],
)
def get_observed_property_types(db: Session = Depends(get_db)):
    return activity_service.get_observed_property_types(db)


@activity_router.get(
    "/service_types",
    response_model=List[meter.ServiceTypeLU],
    dependencies=[Depends(ScopedUser.Read)],
    tags=["Activities"],
)
def get_service_types(db: Session = Depends(get_db)):
    return activity_service.get_service_types(db)


@activity_router.get(
    "/note_types",
    dependencies=[Depends(ScopedUser.Read)],
    tags=["Activities"],
)
def get_note_types(db: Session = Depends(get_db)):
    return activity_service.get_note_types(db)
