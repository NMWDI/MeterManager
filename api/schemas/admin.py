from typing import Optional
import datetime

from api.schemas.base import ORMBase
from pydantic import BaseModel


class BackupFile(ORMBase):
    name: str
    file_size: int
    format: str
    gs_uri: str
    created_utc: Optional[datetime.datetime] = None


class MeterContactSnapshot(BaseModel):
    name: str | None = None
    address: str | None = None


class MeterOwnerChangeRequest(ORMBase):
    meter_id: int
    serial_number: str
    ose_meter_id: int | None = None
    old_water_users: str | None = None
    new_water_users: str | None = None
    old_contacts: list[MeterContactSnapshot] = []
    new_contacts: list[MeterContactSnapshot] = []
    status: str
    created_by: int | None = None
    resolved_by: int | None = None
    created_at: datetime.datetime
    resolved_at: datetime.datetime | None = None


class OSEOwnerSyncResult(BaseModel):
    fetched_count: int
    matched_count: int
    changed_count: int
    created_request_count: int
    notification_count: int
    unmatched_count: int
    skipped_pending_count: int


class MeterOwnerChangeAcceptRequest(BaseModel):
    apply_water_users: bool = True
    apply_contacts: bool = True


class MeterOwnerChangeBulkAcceptResult(BaseModel):
    accepted_count: int
