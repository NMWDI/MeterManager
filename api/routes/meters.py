from datetime import date
from typing import List
from fastapi import Depends, APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import or_, select, desc, and_, text
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError
from fastapi_pagination.ext.sqlalchemy import paginate
from fastapi_pagination import LimitOffsetPage
from api.schemas import meter
from api.schemas import well
from api.models.location import LandOwners, Locations
from api.models.meter import (
    ActivityTypeLU,
    MeterContacts,
    Meters,
    MeterStatusLU,
    MeterTypeLU,
    meterRegisters,
)
from api.models.well import Wells
from api.routes.utils import _patch, _get
from api.session import get_db
from api.services import meters as meter_service
from api.auth.dependencies import ScopedUser
from api.enums import MeterSortByField, MeterStatus, SortDirection

authenticated_meter_router = APIRouter()
public_meter_router = APIRouter()


def _contact_has_value(contact: meter.MeterContact) -> bool:
    return any(
        [
            contact.name,
            contact.address,
        ]
    )


def _replace_meter_contacts(
    db: Session, meter_db: Meters, contacts: list[meter.MeterContact]
) -> None:
    meter_db.contacts.clear()
    for contact in contacts:
        if not _contact_has_value(contact):
            continue
        meter_db.contacts.append(
            MeterContacts(
                name=contact.name,
                address=contact.address,
            )
        )

    first_contact = next(
        (contact for contact in contacts if _contact_has_value(contact)), None
    )
    meter_db.contact_name = first_contact.name if first_contact else None
    db.add(meter_db)


# Get paginated, sorted list of meters, filtered by a search string if applicable
@authenticated_meter_router.get(
    "/meters",
    dependencies=[Depends(ScopedUser.Read)],
    response_model=LimitOffsetPage[meter.MeterListDTO],
    tags=["Meters"],
)
def get_meters(
    # offset: int, limit: int - From fastapi_pagination
    search_string: str = None,
    filter_by_status: List[MeterStatus] = Query("Installed"),
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

            case MeterSortByField.MeterSize:
                return MeterTypeLU.size

    # If 'Warehouse' is in the filter, add 'On Hold' to the filter
    if (
        MeterStatus.OnHold not in filter_by_status
        and MeterStatus.Warehouse in filter_by_status
    ):
        filter_by_status.append(MeterStatus.OnHold)

    # Convert enums to strings
    filter_by_status_str = [status.value for status in filter_by_status]

    # Build the query statement based on query params
    # joinedload loads relationships, outer joins on relationship tables makes them search/sortable
    query_statement = (
        select(Meters)
        .options(
            joinedload(Meters.well),
            joinedload(Meters.status),
            joinedload(Meters.meter_type),
        )
        .join(Wells, isouter=True)
        .join(Locations, isouter=True)
        .join(MeterStatusLU, isouter=True)
        .join(MeterTypeLU, isouter=True)
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
            query_statement = query_statement.order_by(schema_field_name)

    return paginate(db, query_statement)


@authenticated_meter_router.get(
    "/meters/sold-report",
    dependencies=[Depends(ScopedUser.Read)],
    tags=["Meters"],
)
def get_sold_meters_report(
    from_date: date = Query(..., description="Start date YYYY-MM-DD"),
    to_date: date = Query(..., description="End date YYYY-MM-DD"),
    min_size: int | None = Query(None, ge=0),
    max_size: int | None = Query(None, ge=0),
    db: Session = Depends(get_db),
):
    return meter_service.get_sold_meters_report(
        db,
        from_date,
        to_date,
        min_size,
        max_size,
    )


@authenticated_meter_router.get(
    "/meters/sold-report/pdf",
    dependencies=[Depends(ScopedUser.Read)],
    tags=["Meters"],
)
def download_sold_meters_pdf(
    from_date: date = Query(..., description="Start date YYYY-MM-DD"),
    to_date: date = Query(..., description="End date YYYY-MM-DD"),
    min_size: int | None = Query(None, ge=0),
    max_size: int | None = Query(None, ge=0),
    db: Session = Depends(get_db),
):
    pdf_io = meter_service.build_sold_meters_pdf(
        db,
        from_date,
        to_date,
        min_size,
        max_size,
    )

    return StreamingResponse(
        pdf_io,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=sold_meters_report.pdf"},
    )


@authenticated_meter_router.get(
    "/meters/stored-report",
    dependencies=[Depends(ScopedUser.Read)],
    tags=["Meters"],
)
def get_stored_meters_report(
    min_size: int | None = Query(None, ge=0),
    max_size: int | None = Query(None, ge=0),
    db: Session = Depends(get_db),
):
    return meter_service.get_stored_meters_report(
        db,
        min_size,
        max_size,
    )


@authenticated_meter_router.get(
    "/meters/stored-report/pdf",
    dependencies=[Depends(ScopedUser.Read)],
    tags=["Meters"],
)
def download_stored_meters_pdf(
    min_size: int | None = Query(None, ge=0),
    max_size: int | None = Query(None, ge=0),
    db: Session = Depends(get_db),
):
    pdf_io = meter_service.build_stored_meters_pdf(
        db,
        min_size,
        max_size,
    )

    return StreamingResponse(
        pdf_io,
        media_type="application/pdf",
        headers={
            "Content-Disposition": "attachment; filename=stored_meters_report.pdf"
        },
    )


@authenticated_meter_router.get(
    "/meters/installed-report",
    dependencies=[Depends(ScopedUser.Read)],
    tags=["Meters"],
)
def get_installed_meters_report(
    from_date: date = Query(..., description="Start date YYYY-MM-DD"),
    to_date: date = Query(..., description="End date YYYY-MM-DD"),
    min_size: int | None = Query(None, ge=0),
    max_size: int | None = Query(None, ge=0),
    db: Session = Depends(get_db),
):
    return meter_service.get_installed_meters_report(
        db,
        from_date,
        to_date,
        min_size,
        max_size,
    )


@authenticated_meter_router.get(
    "/meters/installed-report/pdf",
    dependencies=[Depends(ScopedUser.Read)],
    tags=["Meters"],
)
def download_installed_meters_pdf(
    from_date: date = Query(..., description="Start date YYYY-MM-DD"),
    to_date: date = Query(..., description="End date YYYY-MM-DD"),
    min_size: int | None = Query(None, ge=0),
    max_size: int | None = Query(None, ge=0),
    db: Session = Depends(get_db),
):
    pdf_io = meter_service.build_installed_meters_pdf(
        db,
        from_date,
        to_date,
        min_size,
        max_size,
    )

    return StreamingResponse(
        pdf_io,
        media_type="application/pdf",
        headers={
            "Content-Disposition": "attachment; filename=installed_meters_report.pdf"
        },
    )


@authenticated_meter_router.post(
    "/meters",
    response_model=meter.Meter,
    dependencies=[Depends(ScopedUser.Admin)],
    tags=["Meters"],
)
def create_meter(new_meter: meter.SubmitNewMeter, db: Session = Depends(get_db)):
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
        notes=new_meter.notes,
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

    contacts = new_meter.contacts
    if not contacts and new_meter.contact_name:
        contacts = [
            meter.MeterContact(
                name=new_meter.contact_name,
            )
        ]
    _replace_meter_contacts(db, new_meter_model, contacts)

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
    response_model=List[meter.MeterMapDTO],
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

    pm_activity_type_id = db.scalars(
        select(ActivityTypeLU.id).where(
            ActivityTypeLU.name == "Preventative Maintenance"
        )
    ).first()
    location_only_activity_type_id = db.scalars(
        select(ActivityTypeLU.id).where(ActivityTypeLU.name == "Location Only")
    ).first()
    repair_activity_type_id = db.scalars(
        select(ActivityTypeLU.id).where(ActivityTypeLU.name == "Repair")
    ).first()

    if not pm_activity_type_id:
        raise HTTPException(
            status_code=500,
            detail="Preventative Maintenance activity type is not configured.",
        )
    if not location_only_activity_type_id:
        raise HTTPException(
            status_code=500,
            detail="Location Only activity type is not configured.",
        )
    if not repair_activity_type_id:
        raise HTTPException(
            status_code=500,
            detail="Repair activity type is not configured.",
        )

    # Query latest PMs tied directly to the meter
    meter_pm_query = text(
        """
        SELECT MAX(timestamp_start) AS last_pm_meter_activity, meter_id
        FROM "MeterActivities"
        WHERE activity_type_id = :pm_activity_type_id
          AND meter_id = ANY(:mids)
        GROUP BY meter_id
        """
    )
    meter_pm_rows = db.execute(
        meter_pm_query,
        {"mids": meter_ids, "pm_activity_type_id": pm_activity_type_id},
    ).fetchall()
    meter_pm_dict = {row.meter_id: row.last_pm_meter_activity for row in meter_pm_rows}

    repair_query = text(
        """
        SELECT MAX(timestamp_start) AS last_repair_meter_activity, meter_id
        FROM "MeterActivities"
        WHERE activity_type_id = :repair_activity_type_id
          AND meter_id = ANY(:mids)
        GROUP BY meter_id
        """
    )
    repair_rows = db.execute(
        repair_query,
        {"mids": meter_ids, "repair_activity_type_id": repair_activity_type_id},
    ).fetchall()
    repair_dict = {
        row.meter_id: row.last_repair_meter_activity for row in repair_rows
    }

    location_only_dict = {}

    if meter_ids:
        location_only_query = text(
            """
            SELECT MAX(timestamp_start) AS last_location_only_meter_activity, meter_id
            FROM "MeterActivities"
            WHERE activity_type_id = :location_only_activity_type_id
              AND meter_id = ANY(:mids)
            GROUP BY meter_id
            """
        )
        location_only_rows = db.execute(
            location_only_query,
            {
                "mids": meter_ids,
                "location_only_activity_type_id": location_only_activity_type_id,
            },
        ).fetchall()
        location_only_dict = {
            row.meter_id: row.last_location_only_meter_activity
            for row in location_only_rows
        }

    # Map to DTOs manually for added performance
    meter_map_list = []
    for row in result:
        meter_map_list.append(
            meter.MeterMapDTO(
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
                last_pm_meter_activity=meter_pm_dict.get(row.id),
                last_repair_meter_activity=repair_dict.get(row.id),
                last_location_only_meter_activity=location_only_dict.get(row.id),
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
        joinedload(Meters.contacts),
        joinedload(Meters.meter_register).joinedload(meterRegisters.dial_units),
        joinedload(Meters.meter_register).joinedload(meterRegisters.totalizer_units),
    )

    # Filter by either meter by id or serial number
    if meter_id:
        query = query.filter(Meters.id == meter_id)
    else:
        query = query.filter(Meters.serial_number == serial_number)

    return db.scalars(query).unique().first()


@authenticated_meter_router.get(
    "/meter_types",
    response_model=List[meter.MeterTypeLU],
    dependencies=[Depends(ScopedUser.Read)],
    tags=["Meters"],
)
def get_meter_types(db: Session = Depends(get_db)):
    return db.scalars(select(MeterTypeLU)).all()


# A route to return register types from meter_register table
@authenticated_meter_router.get(
    "/meter_registers",
    response_model=List[meter.MeterRegister],
    dependencies=[Depends(ScopedUser.Read)],
    tags=["Meters"],
)
def get_meter_registers(db: Session = Depends(get_db)):
    query = select(meterRegisters).options(
        joinedload(meterRegisters.dial_units),
        joinedload(meterRegisters.totalizer_units),
    )

    return db.scalars(query).all()


# A route to return status types from the MeterStatusLU table
@authenticated_meter_router.get(
    "/meter_status_types",
    response_model=List[meter.MeterStatusLU],
    dependencies=[Depends(ScopedUser.Read)],
    tags=["Meters"],
)
def get_meter_status(db: Session = Depends(get_db)):
    return db.scalars(select(MeterStatusLU)).all()


@authenticated_meter_router.patch(
    "/meter_types",
    response_model=meter.MeterTypeLU,
    dependencies=[Depends(ScopedUser.Admin)],
    tags=["Meters"],
)
def update_meter_type(
    updated_meter_type: meter.MeterTypeLU, db: Session = Depends(get_db)
):
    _patch(db, MeterTypeLU, updated_meter_type.id, updated_meter_type)

    meter_type = db.scalars(
        select(MeterTypeLU).where(MeterTypeLU.id == updated_meter_type.id)
    ).first()

    return meter_type


@authenticated_meter_router.post(
    "/meter_types",
    response_model=meter.MeterTypeLU,
    dependencies=[Depends(ScopedUser.Admin)],
    tags=["Meters"],
)
def create_meter_type(new_meter_type: meter.MeterTypeLU, db: Session = Depends(get_db)):
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
    response_model=List[well.LandOwner],
    tags=["Meters"],
)
def get_land_owners(
    db: Session = Depends(get_db),
):
    return db.scalars(select(LandOwners)).all()


@authenticated_meter_router.patch(
    "/meter",
    dependencies=[Depends(ScopedUser.Admin)],
    response_model=meter.Meter,
    tags=["Meters"],
)
def patch_meter(updated_meter: meter.SubmitMeterUpdate, db: Session = Depends(get_db)):
    """
    Update the current state of a meter. This is only used by Meter Details on the frontend.

    Returns http error if meter SN changed to existing SN.
    """
    meter_db = _get(db, Meters, updated_meter.id)

    meter_db.serial_number = updated_meter.serial_number
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

    contacts = updated_meter.contacts
    if not contacts and updated_meter.contact_name:
        contacts = [
            meter.MeterContact(
                name=updated_meter.contact_name,
            )
        ]
    _replace_meter_contacts(db, meter_db, contacts)

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
            joinedload(Meters.contacts),
        )
        .filter(Meters.id == updated_meter.id)
    ).unique().first()


@authenticated_meter_router.get(
    "/meter_history", dependencies=[Depends(ScopedUser.Read)], tags=["Meters"]
)
def get_meter_history(meter_id: int, db: Session = Depends(get_db)):
    return meter_service.get_meter_history(db, meter_id)
