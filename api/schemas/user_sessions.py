from datetime import datetime
from typing import Optional

from api.schemas.base import ORMBase


class SessionSignOutRequest(ORMBase):
    sign_out_reason_name: str
    fingerprint_hash: Optional[str] = None


class ExpiredSessionSignOutRequest(SessionSignOutRequest):
    session_identifier: str


class UserSessionSummary(ORMBase):
    session_identifier: str
    device_label: str | None = None
    device_type: str | None = None
    browser: str | None = None
    operating_system: str | None = None
    ip_address: str | None = None
    signed_in_at: datetime
    last_seen_at: datetime
    signed_out_at: datetime | None = None
    is_active: bool
    sign_out_reason_name: str | None = None
    is_current: bool


class KnownDeviceSummary(ORMBase):
    device_key: str
    device_label: str | None = None
    device_type: str | None = None
    browser: str | None = None
    operating_system: str | None = None
    session_count: int
    active_session_count: int
    signed_in_at_first: datetime
    last_seen_at: datetime
    is_current_device: bool


class UserSessionsResponse(ORMBase):
    current_session_identifier: str | None = None
    sessions: list[UserSessionSummary]
    known_devices: list[KnownDeviceSummary]


class CurrentSessionStatusResponse(ORMBase):
    session_identifier: str
    is_active: bool
