from datetime import datetime
from pydantic import BaseModel
from typing import List
from api.schemas.security import User
from api.schemas.base import ORMBase


class ORMBaseSimple(BaseModel):
    class Config:
        from_attributes = True


class LandOwner(ORMBase):
    contact_name: str | None = None
    organization: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    zip: str | None = None
    phone: str | None = None
    email: str | None = None
    city: str | None = None


class Location(ORMBase):
    name: str | None = None
    type_id: int | None = None
    trss: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    township: int | None = None
    range: int | None = None
    section: int | None = None
    quarter: int | None = None
    half_quarter: int | None = None
    quarter_quarter: int | None = None
    land_owner_id: int | None = None

    land_owner: LandOwner | None = None


class WellUseLU(ORMBase):
    use_type: str
    code: str | None = None
    description: str | None = None


class WaterSources(ORMBase):
    name: str
    description: str | None = None


class WellStatus(ORMBase):
    status: str | None = None
    description: str | None = None


class WellMeterInfo(ORMBase):
    '''Subset of Meter schema'''
    serial_number: str
    water_users: str | None = None


class Well(ORMBase):
    name: str | None = None
    ra_number: str | None = None
    owners: str | None = None
    osetag: str | None = None
    casing: str | None = None
    total_depth: float | None = None
    outside_recorder: bool | None = None

    location_id: int | None = None
    use_type_id: int | None = None
    well_status_id: int | None = None
    water_source_id: int | None = None
    chloride_group_id: int | None = None


class WellResponse(Well):

    location: Location | None = None
    use_type: WellUseLU | None = None
    water_source: WaterSources | None = None
    well_status: WellStatus | None = None
    meters: list[WellMeterInfo] | None = None
    chloride_group_id: int | None = None


class SubmitWellCreate(ORMBaseSimple):
    class SubmitLocationCreate(ORMBaseSimple):
        name: str | None = None
        trss: str
        longitude: float
        latitude: float

    class SubmitUseTypeCreate(ORMBaseSimple):
        id: int

    name: str | None = None
    ra_number: str | None = None
    owners: str | None = None
    osetag: str | None = None

    location: SubmitLocationCreate
    use_type: SubmitUseTypeCreate
    water_source: WaterSources | None = None
    well_status: WellStatus | None = None
    chloride_group_id: int | None = None


class WellUpdate(Well):
    location: Location | None = None
    use_type: WellUseLU | None = None
    water_source: WaterSources | None = None
    well_status: WellStatus | None = None


class SubmitWellMerge(ORMBaseSimple):
    merge_well: str
    target_well: str


class WellListDTO(ORMBase):
    name: str | None = None


class LocationTypeLU(ORMBase):
    type_name: str | None = None
    description: str | None = None


class WellMeasurement(BaseModel):
    timestamp: datetime
    value: float | None = None

    submitting_user_id: int
    unit_id: int
    well_id: int


class ChlorideMeasurement(WellMeasurement):
    # Add on chloride group
    id: int
    chloride_group_id: int | None = None
    submitting_user: User | None = None


class PatchChlorideMeasurement(WellMeasurement):
    # Require additional id
    id: int


class ChlorideGroupResponse(BaseModel):
    id: int
    names: List[str]


class WellMeasurementDTO(ORMBase):
    class config:
        orm_mode = True

    class UserDTO(ORMBase):
        full_name: str

    class WellDTO(ORMBase):
        ra_number: str

    id: int
    timestamp: datetime
    value: float | None = None
    submitting_user: UserDTO
    well: WellDTO


class WaterLevel(ORMBase):
    id: int
    timestamp: datetime
    value: float
    well_id: int
    submitting_user_name: str


class NewWaterLevelMeasurement(ORMBase):
    well_id: int
    timestamp: datetime
    value: float
    submitting_user_id: int


# Well and units should stay the same, so are not included in the patch
class PatchWaterLevel(BaseModel):
    levelmeasurement_id: int
    submitting_user_id: int
    timestamp: datetime
    value: float | None = None
