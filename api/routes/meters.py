from typing import List

from fastapi import Depends, APIRouter, HTTPException, Query
from sqlalchemy import or_, select, desc, and_, text
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError
from fastapi_pagination.ext.sqlalchemy import paginate
from fastapi_pagination import LimitOffsetPage
from fastapi.responses import StreamingResponse
from enum import Enum
from io import BytesIO
from jose import jwt, JWTError, ExpiredSignatureError
from api.schemas import meter_schemas
from api.schemas import well_schemas
from api.models.main_models import (
    Meters,
    LandOwners,
    MeterActivities,
    Parts,
    MeterObservations,
    Locations,
    MeterTypeLU,
    Wells,
    MeterStatusLU,
    meterRegisters,
)
from api.route_util import _patch, _get
from api.session import get_db
from api.enums import ScopedUser, MeterSortByField, MeterStatus, SortDirection
from google.cloud import storage

import time
import mimetypes
import os

authenticated_meter_router = APIRouter()
public_meter_router = APIRouter()

# Generate random secret at startup
PHOTO_JWT_SECRET = os.getenv("PHOTO_JWT_SECRET", "super-secret")
PHOTO_JWT_ALGORITHM = "HS256"
PHOTO_JWT_EXPIRE_SECONDS = 600  # 10 minutes
BUCKET_NAME = os.getenv("GCP_BUCKET_NAME", "")

# Get paginated, sorted list of meters, filtered by a search string if applicable
@authenticated_meter_router.get(
    "/meters",
    dependencies=[Depends(ScopedUser.Read)],
    response_model=LimitOffsetPage[meter_schemas.MeterListDTO],
    tags=["Meters"],
)
def get_meters(
    # offset: int, limit: int - From fastapi_pagination
    search_string: str = None,
    filter_by_status: List[MeterStatus] = Query('Installed'),
    sort_by: MeterSortByField = MeterSortByField.SerialNumber,
    sort_direction: SortDirection = SortDirection.Ascending,
    db: Session = Depends(get_db),
):
    def sort_by_field_to_schema_field(name: MeterSortByField):
        match name:
            case MeterSortByField.SerialNumber:
                return Meters.serial_number

            case MeterSortByField.RANumber:
                return Wells.ra_number

            case MeterSortByField.WaterUsers:
                return Meters.water_users

            case MeterSortByField.TRSS:
                return Locations.trss
    
    # If 'Warehouse' is in the filter, add 'On Hold' to the filter
    if MeterStatus.OnHold not in filter_by_status and MeterStatus.Warehouse in filter_by_status:
        filter_by_status.append(MeterStatus.OnHold)

    # Convert enums to strings
    filter_by_status_str = [status.value for status in filter_by_status]
    
    # Build the query statement based on query params
    # joinedload loads relationships, outer joins on relationship tables makes them search/sortable
    query_statement = (
        select(Meters)
        .options(joinedload(Meters.well), joinedload(Meters.status))
        .join(Wells, isouter=True)
        .join(Locations, isouter=True)
        .join(MeterStatusLU, isouter=True)
        .where(MeterStatusLU.status_name.in_(filter_by_status_str))
    )

    if search_string:
        query_statement = query_statement.where(
            or_(
                Meters.serial_number.ilike(f"%{search_string}%"),
                Wells.ra_number.ilike(f"%{search_string}%"),
                Locations.trss.ilike(f"%{search_string}%"),
                Meters.water_users.ilike(f"%{search_string}%"),
            )
        )

    if sort_by:
        schema_field_name = sort_by_field_to_schema_field(sort_by)

        if sort_direction != SortDirection.Ascending:
            query_statement = query_statement.order_by(desc(schema_field_name))
        else:
            query_statement = query_statement.order_by(
                schema_field_name
            )  # SQLAlchemy orders ascending by default

    # Print the SQL query for debugging
    #print(query_statement)

    return paginate(db, query_statement)


@authenticated_meter_router.post(
    "/meters",
    response_model=meter_schemas.Meter,
    dependencies=[Depends(ScopedUser.Admin)],
    tags=["Meters"],
)
def create_meter(
    new_meter: meter_schemas.SubmitNewMeter, db: Session = Depends(get_db)
):
    """
    Create a new meter. This requires a SN and meter type.
    Status is infered from based on if a well is provided.
    """
    warehouse_status_id = db.scalars(
        select(MeterStatusLU.id).where(MeterStatusLU.status_name == "Warehouse")
    ).first()

    warehouse_location_id = db.scalars(
        select(Locations.id).where(Locations.name == "headquarters")
    ).first()

    # Create a meter located in warehouse
    new_meter_model = Meters(
        serial_number=new_meter.serial_number,
        contact_name=new_meter.contact_name,
        contact_phone=new_meter.contact_phone,
        meter_type_id=new_meter.meter_type.id,
        price=new_meter.price,
        status_id=warehouse_status_id,
        location_id=warehouse_location_id,
        meter_owner="PVACD",
    )

    # If there is a register set, add it to the meter
    if new_meter.meter_register:
        new_meter_model.register_id = new_meter.meter_register.id

    # If there is a well set, update status, well and location
    if new_meter.well:
        new_meter_model.status_id = db.scalars(
            select(MeterStatusLU.id).where(MeterStatusLU.status_name == "Installed")
        ).first()

        new_meter_model.well_id = new_meter.well.id
        new_meter_model.location_id = new_meter.well.location_id

    # Try adding the meter, if it fails due to integrety error...
    try:
        db.add(new_meter_model)
        db.commit()
    except IntegrityError:
        raise HTTPException(status_code=409, detail="Meter already exists")

    db.refresh(new_meter_model)

    return new_meter_model


# Get search for meters similar to /meters but no pagination and only for installed meters
# Returns all installed meters with a location when search is None
# Also returns year of last PM for color coding on the map
@authenticated_meter_router.get(
    "/meters_locations",
    dependencies=[Depends(ScopedUser.Read)],
    response_model=List[meter_schemas.MeterMapDTO],
    tags=["Meters"],
)
def get_meters_locations(
    search_string: str = None,
    db: Session = Depends(get_db),
):
    query_statement = (
        select(
            Meters.id,
            Meters.serial_number,
            Wells.id.label("well_id"),
            Wells.ra_number,
            Wells.name,
            Locations.id.label("location_id"),
            Locations.latitude,
            Locations.longitude,
            Locations.trss,
        )
        .select_from(Meters)
        .join(Wells, Meters.well_id == Wells.id, isouter=True)
        .join(Locations, Wells.location_id == Locations.id, isouter=True)
        .where(
            and_(
                Locations.latitude.is_not(None),
                Locations.longitude.is_not(None),
                Meters.status_id == 1,  # Only installed meters
            )
        )
    )

    if search_string:
        ilike_term = f"%{search_string}%"
        query_statement = query_statement.where(
            or_(
                Meters.serial_number.ilike(ilike_term),
                Wells.ra_number.ilike(ilike_term),
                Locations.trss.ilike(ilike_term),
            )
        )

    result = db.execute(query_statement).fetchall()
    meter_ids = [row.id for row in result]

    if not meter_ids:
        return []  # Short-circuit if nothing matched

    # Query latest PMs for those meters 
    pm_query = text(
        """
        SELECT MAX(timestamp_start) AS last_pm, meter_id
        FROM "MeterActivities"
        WHERE activity_type_id = 4
          AND meter_id = ANY(:mids)
        GROUP BY meter_id
        """
    )
    pm_years = db.execute(pm_query, {"mids": meter_ids}).fetchall()
    pm_dict = {row.meter_id: row.last_pm for row in pm_years}

    # Map to DTOs manually for added performance 
    meter_map_list = []
    for row in result:
        meter_map_list.append(
            meter_schemas.MeterMapDTO(
                id=row.id,
                serial_number=row.serial_number,
                well={
                    "id": row.well_id,
                    "ra_number": row.ra_number,
                    "name": row.name,
                },
                location={
                    "id": row.location_id,
                    "latitude": row.latitude,
                    "longitude": row.longitude,
                    "trss": row.trss,
                },
                last_pm=pm_dict.get(row.id)
            )
        )

    return meter_map_list



def require_meter_id_or_serial_number(meter_id: int = None, serial_number: str = None):
    if not meter_id and not serial_number:
        raise HTTPException(
            status_code=400, detail="Must provide either meter_id or serial_number"
        )

    return meter_id, serial_number

# Get single, fully qualified meter
# Can use either meter_id or serial_number
@authenticated_meter_router.get(
    "/meter",
    tags=["Meters"],
)
def get_meter(
    meter_identifier: tuple = Depends(require_meter_id_or_serial_number),
    db: Session = Depends(get_db),
):
    meter_id, serial_number = meter_identifier

    # Create the basic query
    query = select(Meters).options(
            joinedload(Meters.meter_type),
            joinedload(Meters.well).joinedload(Wells.location),
            joinedload(Meters.status),
            joinedload(Meters.meter_register).joinedload(meterRegisters.dial_units),
            joinedload(Meters.meter_register).joinedload(meterRegisters.totalizer_units),
        )

    # Filter by either meter by id or serial number
    if meter_id:
        query = query.filter(Meters.id == meter_id)
    else:
        query = query.filter(Meters.serial_number == serial_number)

    return db.scalars(query).first()


@authenticated_meter_router.get(
    "/meter_types",
    response_model=List[meter_schemas.MeterTypeLU],
    dependencies=[Depends(ScopedUser.Read)],
    tags=["Meters"],
)
def get_meter_types(db: Session = Depends(get_db)):
    return db.scalars(select(MeterTypeLU)).all()


# A route to return register types from meter_register table
@authenticated_meter_router.get(
    "/meter_registers",
    response_model=List[meter_schemas.MeterRegister],
    dependencies=[Depends(ScopedUser.Read)],
    tags=["Meters"],
)
def get_meter_registers(db: Session = Depends(get_db)):
    query = select(meterRegisters).options(
        joinedload(meterRegisters.dial_units),
        joinedload(meterRegisters.totalizer_units)
    )

    return db.scalars(query).all()



# A route to return status types from the MeterStatusLU table
@authenticated_meter_router.get(
    "/meter_status_types",
    response_model=List[meter_schemas.MeterStatusLU],
    dependencies=[Depends(ScopedUser.Read)],
    tags=["Meters"],
)
def get_meter_status(db: Session = Depends(get_db)):
    return db.scalars(select(MeterStatusLU)).all()


@authenticated_meter_router.patch(
    "/meter_types",
    response_model=meter_schemas.MeterTypeLU,
    dependencies=[Depends(ScopedUser.Admin)],
    tags=["Meters"],
)
def update_meter_type(
    updated_meter_type: meter_schemas.MeterTypeLU, db: Session = Depends(get_db)
):
    _patch(db, MeterTypeLU, updated_meter_type.id, updated_meter_type)

    meter_type = db.scalars(
        select(MeterTypeLU).where(MeterTypeLU.id == updated_meter_type.id)
    ).first()

    return meter_type


@authenticated_meter_router.post(
    "/meter_types",
    response_model=meter_schemas.MeterTypeLU,
    dependencies=[Depends(ScopedUser.Admin)],
    tags=["Meters"],
)
def create_meter_type(
    new_meter_type: meter_schemas.MeterTypeLU, db: Session = Depends(get_db)
):
    new_type_model = MeterTypeLU(
        brand=new_meter_type.brand,
        series=new_meter_type.series,
        model=new_meter_type.model,
        size=new_meter_type.size,
        description=new_meter_type.description,
        in_use=new_meter_type.in_use,
    )

    db.add(new_type_model)
    db.commit()
    db.refresh(new_type_model)

    return new_type_model


@authenticated_meter_router.get(
    "/land_owners",
    dependencies=[Depends(ScopedUser.Read)],
    response_model=List[well_schemas.LandOwner],
    tags=["Meters"],
)
def get_land_owners(
    db: Session = Depends(get_db),
):
    return db.scalars(select(LandOwners)).all()


@authenticated_meter_router.patch(
    "/meter",
    dependencies=[Depends(ScopedUser.Admin)],
    response_model=meter_schemas.Meter,
    tags=["Meters"],
)
def patch_meter(
    updated_meter: meter_schemas.SubmitMeterUpdate, db: Session = Depends(get_db)
):
    """
    Update the current state of a meter. This is only used by Meter Details on the frontend.

    Returns http error if meter SN changed to existing SN.
    """
    meter_db = _get(db, Meters, updated_meter.id)

    meter_db.serial_number = updated_meter.serial_number
    meter_db.contact_name = updated_meter.contact_name
    meter_db.contact_phone = updated_meter.contact_phone
    meter_db.notes = updated_meter.notes
    meter_db.price = updated_meter.price
    meter_db.meter_type_id = updated_meter.meter_type.id
    meter_db.water_users = updated_meter.water_users
    meter_db.meter_owner = updated_meter.meter_owner
    meter_db.register_id = updated_meter.meter_register.id

    # If there is a well set, update status, well and location
    if updated_meter.well:
        meter_db.status_id = db.scalars(
            select(MeterStatusLU.id).where(MeterStatusLU.status_name == "Installed")
        ).first()

        meter_db.well_id = updated_meter.well.id
        meter_db.location_id = updated_meter.well.location_id
    else:
        # If there is no well set, clear the well and location
        meter_db.location_id = None
        meter_db.well_id = None

    # Update the meter status, if it isn't set don't update it
    if updated_meter.status:
        meter_db.status_id = updated_meter.status.id

    try:
        db.add(meter_db)
        db.commit()
    except IntegrityError:
        raise HTTPException(status_code=409, detail="Meter already exists")

    return db.scalars(
        select(Meters)
        .options(
            joinedload(Meters.meter_type),
            joinedload(Meters.well).joinedload(Wells.location),
            joinedload(Meters.status),
        )
        .filter(Meters.id == updated_meter.id)
    ).first()


@public_meter_router.get("/photos/{path:path}")
def get_photo(path: str, token: str = Query(...)):
    # raises 401 if invalid
    blob_path = verify_photo_token(token)

    # extra guard: token "sub" must match requested path
    if blob_path != path:
        raise HTTPException(status_code=403, detail="Token path mismatch")

    client = storage.Client()
    bucket = client.bucket(BUCKET_NAME)
    blob = bucket.blob(path)

    if not blob.exists():
        raise HTTPException(status_code=404, detail="Photo not found")

    content_type, _ = mimetypes.guess_type(path)
    content_type = content_type or "application/octet-stream"

    data = blob.download_as_bytes()

    return StreamingResponse(
        BytesIO(data),
        media_type=content_type,
        headers={
            "Cache-Control": f"public, max-age={PHOTO_JWT_EXPIRE_SECONDS}",
            "ETag": blob.etag or "",
        },
    )


@authenticated_meter_router.get(
    "/meter_history", dependencies=[Depends(ScopedUser.Read)], tags=["Meters"]
)
def get_meter_history(meter_id: int, db: Session = Depends(get_db)):
    """
    Get a list of the given meters history.
    No defined schema for this at the moment.
    """

    class HistoryType(Enum):
        Activity = "Activity"
        Observation = "Observation"
        LocationChange = "LocationChange"

    activities = (
        db.scalars(
            select(MeterActivities)
            .options(
                joinedload(MeterActivities.location),
                joinedload(MeterActivities.submitting_user),
                joinedload(MeterActivities.activity_type),
                joinedload(MeterActivities.parts_used).joinedload(Parts.part_type),
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

    # Take all the history object we just got from the database and make them into a object that's easy for the frontend to consume
    formattedHistoryItems = []
    itemID = 0

    for activity in activities:
        activity.location.geom = None  # FastAPI errors when returning this

        #Find if there is a well associated with the location
        activity_well = db.scalars(select(Wells).where(Wells.location_id == activity.location_id)).first()

        photos = [
            {
                "id": photo.id,
                "file_name": photo.file_name,
                "url": f"/photos/{photo.gcs_path}?token={create_photo_token(photo.gcs_path)}",
                "uploaded_at": photo.uploaded_at,
            }
            for photo in activity.photos
        ]

        formattedHistoryItems.append(
            {
                "id": itemID,
                "history_type": HistoryType.Activity,
                "well": activity_well,
                "location": activity.location,
                "activity_type": activity.activity_type_id,
                "date": activity.timestamp_start,
                "history_item": activity,
                "photos": photos,
            }
        )
        itemID += 1

    for observation in observations:
        observation.location.geom = None

        #Find if there is a well associated with the location
        observation_well = db.scalars(select(Wells).where(Wells.location_id == observation.location_id)).first()

        formattedHistoryItems.append(
            {
                "id": itemID,
                "history_type": HistoryType.Observation,
                "well": observation_well,
                "location": observation.location,
                "date": observation.timestamp,
                "history_item": observation,
            }
        )
        itemID += 1

    # Add location history also

    formattedHistoryItems.sort(key=lambda x: x["date"], reverse=True)

    return formattedHistoryItems


def create_photo_token(blob_path: str) -> str:
    expire = int(time.time()) + PHOTO_JWT_EXPIRE_SECONDS
    payload = {"sub": blob_path, "exp": expire}
    token = jwt.encode(payload, PHOTO_JWT_SECRET, algorithm=PHOTO_JWT_ALGORITHM)
    return token


def verify_photo_token(token: str) -> str:
    try:
        payload = jwt.decode(
            token,
            PHOTO_JWT_SECRET,
            algorithms=[PHOTO_JWT_ALGORITHM]
        )
        return payload["sub"]
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except JWTError as e:
        print("Token verification failed:", str(e))
        raise HTTPException(status_code=401, detail="Invalid token")
