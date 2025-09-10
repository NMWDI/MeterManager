from datetime import datetime
from api.schemas.base import ORMBase
from api.schemas.well_schemas import Well, Location
from api.schemas.security_schemas import User
from pydantic import BaseModel

class Unit(ORMBase):
    name: str | None = None
    name_short: str | None = None
    description: str | None = None

class MeterTypeLU(ORMBase):
    brand: str | None = None
    series: str | None = None
    model: str
    size: float | None = None
    description: str | None = None
    in_use: bool

class MeterRegister(ORMBase):
    '''
    This is the complete description of a meter register.
    In contrast PublicMeter.MeterRegister is more limited.
    '''
    brand: str
    meter_size: float | None = None
    part_id: int | None = None
    ratio: str | None = None
    number_of_digits: int | None = None
    decimal_digits: int | None = None
    dial_units: Unit
    totalizer_units: Unit
    multiplier: float | None = None
    notes: str | None = None


# The minimal information used by the meters list
class MeterListDTO(ORMBase):
    class WellDTO(ORMBase):
        ra_number: str | None = None
        name: str | None = None
        owners: str | None = None

    class LocationDTO(ORMBase):
        trss: str | None = None
        longitude: float | None = None
        latitude: float | None = None

    class StatusDTO(ORMBase):
        status_name: str | None = None

    id: int
    serial_number: str
    water_users: str | None = None
    well: WellDTO | None = None
    location: LocationDTO | None = None
    status: StatusDTO | None = None


# Similar to MeterListDTO, but focused on location and installed meters
class MeterMapDTO(ORMBase):
    class WellDTO(ORMBase):
        ra_number: str | None = None
        name: str | None = None

    class LocationDTO(ORMBase):
        trss: str | None = None
        longitude: float | None = None
        latitude: float | None = None

    id: int
    serial_number: str
    well: WellDTO | None = None
    location: LocationDTO | None = None
    last_pm: datetime | None = None


class MeterStatusLU(ORMBase):
    status_name: str | None = None
    description: str | None = None


class NoteTypeLU(ORMBase):
    note: str | None = None
    details: str | None = None
    slug: str | None = None


class SubmitNewMeter(ORMBase):
    serial_number: str
    meter_type: MeterTypeLU

    contact_name: str | None = None
    contact_phone: str | None = None
    notes: str | None = None
    well: Well | None = None
    meter_register: MeterRegister | None = None


class SubmitMeterUpdate(ORMBase):
    serial_number: str
    contact_name: str | None = None
    contact_phone: str | None = None
    notes: str | None = None
    meter_type: MeterTypeLU
    status: MeterStatusLU | None = None
    meter_register: MeterRegister | None = None
    well: Well | None = None
    water_users: str | None = None
    meter_owner: str | None = None


class Meter(ORMBase):
    serial_number: str
    contact_name: str | None = None
    contact_phone: str | None = None
    notes: str | None = None

    meter_type_id: int
    status_id: int | None = 6  # Default "unknown"
    well_id: int | None = None
    location_id: int | None = None

    meter_type: MeterTypeLU | None = None
    status: MeterStatusLU | None = None
    well: Well | None = None
    location: Location | None = None

class PublicMeter(BaseModel):
    '''
    Used for displaying meter information to the public, specifically the OSE
    '''
    
    class PublicWell(BaseModel):
        ra_number: str | None = None
        osetag: str | None = None
        trss: str | None = None
        longitude: float | None = None
        latitude: float | None = None

    class MeterType(BaseModel):
        brand: str | None = None
        model: str
        size: float | None = None

    class MeterRegister(BaseModel):
        ratio: str | None = None
        number_of_digits: int | None = None
        decimal_digits: int | None = None
        dial_units: str | None = None
        totalizer_units: str | None = None
        multiplier: float | None = None

    serial_number: str
    status: str | None = None
    well: PublicWell | None = None
    notes: str | None = None

    meter_type: MeterType | None = None
    meter_register: MeterRegister | None = None
 


# The activity form submitted by the frontend
class ActivityForm(ORMBase):
    class ActivityDetails(ORMBase):
        meter_id: int
        activity_type_id: int
        user_id: int
        date: datetime
        start_time: datetime
        end_time: datetime
        share_ose: bool = False
        work_order_id: int | None = None

    class CurrentInstallation(ORMBase):
        contact_name: str | None = None
        contact_phone: str | None = None
        well_id: int | None = None
        notes: str | None = None
        water_users: str | None = None
        meter_owner: str | None = None

    class ObservationForm(ORMBase):
        time: datetime
        reading: float
        property_type_id: int
        unit_id: int

    class MaintenanceRepair(ORMBase):
        service_type_ids: list[int] | None = None
        description: str | None = None

    class Notes(ORMBase):
        working_on_arrival_slug: str
        selected_note_ids: list[int] | None = None

    activity_details: ActivityDetails
    current_installation: CurrentInstallation
    observations: list[ObservationForm] | None = None
    maintenance_repair: MaintenanceRepair | None = None
    notes: Notes
    part_used_ids: list[int] | None = None


class ActivityTypeLU(ORMBase):
    name: str | None = None
    description: str | None = None


class MeterActivityPhoto(ORMBase):
    id: int
    file_name: str
    gcs_path: str
    uploaded_at: datetime

class MeterActivity(ORMBase):
    timestamp_start: datetime
    timestamp_end: datetime
    description: str | None = None

    submitting_user_id: int
    meter_id: int
    activity_type_id: int
    location_id: int
    ose_share: bool
    water_users: str | None = None

    photos: list[MeterActivityPhoto] = []


class PatchActivity(ORMBase):
    activity_id: int
    timestamp_start: datetime
    timestamp_end: datetime
    description: str | None = None

    submitting_user_id: int
    meter_id: int
    activity_type_id: int
    location_id: int | None = None # This will be null when activity took place at warehouse
    ose_share: bool
    water_users: str | None = None

    note_ids: list[int] | None = None
    service_ids: list[int] | None = None
    part_ids: list[int] | None = None


class ObservedPropertyTypeLU(ORMBase):
    name: str | None = None
    description: str | None = None
    context: str | None = None

    units: list[Unit] | None = None


class MeterObservation(ORMBase):
    timestamp: datetime
    value: float
    notes: str | None = None

    submitting_user_id: int
    meter_id: int
    observed_property_type_id: int
    unit_id: int
    location_id: int
    ose_share: bool = False

    submitting_user: User | None = None
    meter: Meter | None = None
    observed_property_type: ObservedPropertyTypeLU | None = None
    unit: Unit | None = None
    location: Location | None = None


class PatchObservation(ORMBase):
    observation_id: int
    timestamp: datetime
    value: float
    notes: str | None = None

    submitting_user_id: int
    meter_id: int
    observed_property_type_id: int
    unit_id: int
    location_id: int | None = None
    ose_share: bool = False


class ServiceTypeLU(ORMBase):
    service_name: str | None = None
    description: str | None = None


class WorkOrder(ORMBase):
    work_order_id: int
    ose_request_id: int | None = None
    date_created: datetime
    creator: str | None = None
    meter_id: int  # Might be needed in certain situations
    meter_serial: str
    title: str
    description: str | None = None
    status: str
    notes: str | None = None
    assigned_user_id: int | None = None # Might need this for editing user
    assigned_user: str | None = None
    associated_activities: list[MeterActivity] | None = None


class CreateWorkOrder(BaseModel):
    '''
    Only mandatory fields are the date_created, meter_id, and title. The rest can be filled in later.
    I want the frontend to submit the date in case the server is in another timezone.
    Status will always be set to Open when a work order is created.
    '''
    date_created: datetime
    meter_id: int
    title: str
    description: str | None = None
    notes: str | None = None
    creator: str | None = None
    assigned_user_id: int | None = None
    ose_request_id: int | None = None


class PatchWorkOrder(BaseModel):
    '''
    It could be confusing to change the date and serial number of an existing work order because
    one might lose track of what the work order was originally for. So, the inputs here are more limited than
    for work orders that are being created.
    '''
    work_order_id: int
    title: str | None = None
    description: str | None = None
    status: str | None = None
    notes: str | None = None
    creator: str | None = None
    assigned_user_id: int | None = None

class DBTypesForOSE(BaseModel):
    '''
    Descriptions from the various look up tables that are relevant to the OSE.
    '''
    class GeneralTypeInfo(BaseModel):
        name: str
        description: str | None = None

    activity_types: list[GeneralTypeInfo]
    observed_property_types: list[GeneralTypeInfo]
    service_types: list[GeneralTypeInfo]
    note_types: list[GeneralTypeInfo]
    meter_status_types: list[GeneralTypeInfo]
    
