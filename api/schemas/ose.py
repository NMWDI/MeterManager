from datetime import date, datetime, time

from pydantic import BaseModel, Field


class MeterActivityPhotoDTO(BaseModel):
    name: str
    url: str


class ObservationDTO(BaseModel):
    observation_time: time
    observation_type: str
    measurement: float
    units: str


class ActivityDTO(BaseModel):
    activity_id: int
    ose_request_id: int | None = None
    activity_start: datetime
    activity_end: datetime
    activity_type: str
    well_ra_number: str | None
    well_ose_tag: str | None
    description: str
    services: list[str] = Field(default_factory=list)
    notes: list[str] = Field(default_factory=list)
    parts_used: list[str] = Field(default_factory=list)
    observations: list[ObservationDTO] = Field(default_factory=list)
    meter_activity_photos: list[MeterActivityPhotoDTO] = Field(default_factory=list)


class MeterHistoryDTO(BaseModel):
    serial_number: str
    activities: list[ActivityDTO] = Field(default_factory=list)


class DateHistoryDTO(BaseModel):
    date: date
    meters: list[MeterHistoryDTO] = Field(default_factory=list)


class DisapprovalStatus(BaseModel):
    ose_request_id: int
    status: str
    notes: str | None = None
    disapproval_activity: ActivityDTO | None = None
    new_activities: list[ActivityDTO] | None = None

