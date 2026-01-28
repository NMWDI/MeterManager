from typing import Optional
from datetime import date
from api.schemas.base import ORMBase
from api.schemas.meter_schemas import MeterTypeLU


class PartTypeLU(ORMBase):
    name: str | None = None
    description: str | None = None


class Part(ORMBase):
    part_number: str
    description: str | None = None
    vendor: str | None = None

    initial_count: int
    current_count: Optional[int] = None

    note: str | None = None
    in_use: bool
    commonly_used: bool
    price: float | None = None
    part_type_id: int

    part_type: PartTypeLU | None = None
    meter_types: list[MeterTypeLU] | None = None


class Register(Part):
    """
    Adds on register specific fields to the Part model.
    Note: There is also a MeterRegister schema that is used on the Meters view. I might want
    to merge these two in the future, but for now they are separate.
    """

    class register_details(ORMBase):
        brand: str
        meter_size: float
        ratio: str
        dial_units_id: int | None = None
        totalizer_units_id: int | None = None
        number_of_digits: int | None = None
        multiplier: float | None = None

    register_settings: register_details | None = None


class PartUsed(ORMBase):
    part_id: int
    meter_id: int


class PartsAddRequest(ORMBase):
    part_id: int
    count: int
    date: date
    note: Optional[str] = None
