from enum import Enum

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from api.models.meter import MeterActivities, MeterObservations
from api.models.part import Parts, PartsUsed
from api.models.well import Wells
from api.services.storage import create_signed_url


class HistoryType(Enum):
    Activity = "Activity"
    Observation = "Observation"
    LocationChange = "LocationChange"


def get_meter_history(db: Session, meter_id: int):
    activities = (
        db.scalars(
            select(MeterActivities)
            .options(
                joinedload(MeterActivities.location),
                joinedload(MeterActivities.submitting_user),
                joinedload(MeterActivities.activity_type),
                joinedload(MeterActivities.parts_used_links)
                .joinedload(PartsUsed.part)
                .joinedload(Parts.part_type),
                joinedload(MeterActivities.notes),
                joinedload(MeterActivities.services_performed),
            )
            .filter(MeterActivities.meter_id == meter_id)
        )
        .unique()
        .all()
    )

    observations = db.scalars(
        select(MeterObservations)
        .options(
            joinedload(MeterObservations.submitting_user),
            joinedload(MeterObservations.observed_property),
            joinedload(MeterObservations.unit),
            joinedload(MeterObservations.location),
        )
        .filter(MeterObservations.meter_id == meter_id)
    ).all()

    formatted_history_items = []
    item_id = 0

    for activity in activities:
        activity.location.geom = None
        activity_well = db.scalars(
            select(Wells).where(Wells.location_id == activity.location_id)
        ).first()
        photos = [
            {
                "id": photo.id,
                "file_name": photo.file_name,
                "url": create_signed_url(photo.gcs_path),
                "uploaded_at": photo.uploaded_at,
            }
            for photo in activity.photos
        ]
        formatted_history_items.append(
            {
                "id": item_id,
                "history_type": HistoryType.Activity,
                "well": activity_well,
                "location": activity.location,
                "activity_type": activity.activity_type_id,
                "date": activity.timestamp_start,
                "history_item": activity,
                "photos": photos,
            }
        )
        item_id += 1

    for observation in observations:
        observation.location.geom = None
        observation_well = db.scalars(
            select(Wells).where(Wells.location_id == observation.location_id)
        ).first()
        formatted_history_items.append(
            {
                "id": item_id,
                "history_type": HistoryType.Observation,
                "well": observation_well,
                "location": observation.location,
                "date": observation.timestamp,
                "history_item": observation,
            }
        )
        item_id += 1

    formatted_history_items.sort(key=lambda item: item["date"], reverse=True)
    return formatted_history_items
