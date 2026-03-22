import os
import uuid
from datetime import timedelta
from pathlib import Path

from fastapi import HTTPException, UploadFile
from google.auth import default, impersonated_credentials
from google.cloud import storage
from sqlalchemy import select
from sqlalchemy.orm import Session

from api.models.meter import MeterActivities, MeterActivityPhotos


BUCKET_NAME = os.getenv("GCP_BUCKET_NAME", "")
PHOTO_PREFIX = os.getenv("GCP_PHOTO_PREFIX", "")
PHOTO_JWT_EXPIRE_SECONDS = 600
TARGET_SERVICE_ACCOUNT = (
    "pvacd-meterapp@waterdatainitiative-271000.iam.gserviceaccount.com"
)


def get_activity_photo_record(
    db: Session, activity_id: int, photo_file_name: str
) -> MeterActivityPhotos:
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

    return photo


def open_activity_photo(photo: MeterActivityPhotos):
    try:
        client = storage.Client()
        bucket = client.bucket(BUCKET_NAME)
        blob = bucket.blob(photo.gcs_path)

        if not blob.exists(client=client):
            raise HTTPException(status_code=404, detail="Photo file missing from storage")

        blob.reload(client=client)
        content_type = blob.content_type or "application/octet-stream"
        headers = {"Content-Disposition": f'inline; filename="{photo.file_name}"'}
        return blob.open("rb"), content_type, headers
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to retrieve photo")


async def save_activity_photos(
    db: Session,
    meter_activity: MeterActivities,
    photos: list[UploadFile],
    max_photos_per_meter: int,
):
    if not photos:
        return

    bucket = storage.Client().bucket(BUCKET_NAME)

    for file in photos:
        ext = Path(file.filename).suffix or ".jpg"
        unique_name = f"{uuid.uuid4()}{ext}"
        blob_path = f"{PHOTO_PREFIX}/{meter_activity.id}/{unique_name}"
        blob = bucket.blob(blob_path)
        contents = await file.read()
        blob.upload_from_string(contents, content_type=file.content_type)

        db.add(
            MeterActivityPhotos(
                meter_activity_id=meter_activity.id,
                file_name=unique_name,
                gcs_path=blob_path,
            )
        )

    db.commit()
    db.refresh(meter_activity)
    enforce_activity_photo_retention(
        db=db,
        meter_id=meter_activity.meter_id,
        max_photos_per_meter=max_photos_per_meter,
        bucket=bucket,
    )


def enforce_activity_photo_retention(
    db: Session,
    meter_id: int,
    max_photos_per_meter: int,
    bucket=None,
):
    all_photos = (
        db.query(MeterActivityPhotos)
        .join(MeterActivities)
        .filter(MeterActivities.meter_id == meter_id)
        .order_by(MeterActivityPhotos.uploaded_at.desc())
        .all()
    )

    if len(all_photos) <= max_photos_per_meter:
        return

    bucket = bucket or storage.Client().bucket(BUCKET_NAME)
    for photo in all_photos[max_photos_per_meter:]:
        try:
            bucket.blob(photo.gcs_path).delete()
        except Exception as exc:
            print(f"Warning: failed to delete {photo.gcs_path} from GCS: {exc}")
        db.delete(photo)

    db.commit()


def delete_activity_photos(db: Session, activity_id: int):
    photos = db.scalars(
        select(MeterActivityPhotos).where(
            MeterActivityPhotos.meter_activity_id == activity_id
        )
    ).all()

    bucket = storage.Client().bucket(BUCKET_NAME)
    for photo in photos:
        try:
            bucket.blob(photo.gcs_path).delete()
        except Exception as exc:
            print(f"Failed to delete {photo.gcs_path} from bucket: {exc}")


def create_signed_url(blob_path: str) -> str:
    source_creds, _ = default()
    creds = impersonated_credentials.Credentials(
        source_credentials=source_creds,
        target_principal=TARGET_SERVICE_ACCOUNT,
        target_scopes=["https://www.googleapis.com/auth/devstorage.read_only"],
        lifetime=3600,
    )
    storage_client = storage.Client(credentials=creds)
    blob = storage_client.bucket(BUCKET_NAME).blob(blob_path)
    return blob.generate_signed_url(
        version="v4",
        expiration=timedelta(seconds=PHOTO_JWT_EXPIRE_SECONDS),
        method="GET",
    )
