from datetime import datetime

from pydantic import BaseModel


class AqueductWell(BaseModel):
    id: int
    name: str | None = None
    total_depth: float | None = None
    location_name: str | None = None
    latitude: float | None = None
    longitude: float | None = None


class AqueductMeasurement(BaseModel):
    id: int
    well_id: int
    timestamp: datetime
    value: float | None = None
    observed_property_name: str | None = None
    observed_property_description: str | None = None
    observed_property_context: str | None = None
    unit_name: str | None = None
    unit_name_short: str | None = None
    unit_description: str | None = None
