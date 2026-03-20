from collections import defaultdict
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from starlette import status

from api.models.main_models import UserSessions, Users
from api.schemas.base import ORMBase
from api.security import get_current_user, get_session_identifier_from_token, oauth2_scheme
from api.session import get_db
from api.session_tracking import mark_session_signed_out

user_sessions_router = APIRouter(tags=["Login"])


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


def serialize_session(
    session: UserSessions,
    *,
    current_session_identifier: str | None,
) -> UserSessionSummary:
    return UserSessionSummary(
        session_identifier=session.session_identifier,
        device_label=session.device_label,
        device_type=session.device_type,
        browser=session.browser,
        operating_system=session.operating_system,
        ip_address=session.ip_address,
        signed_in_at=session.signed_in_at,
        last_seen_at=session.last_seen_at,
        signed_out_at=session.signed_out_at,
        is_active=session.is_active,
        sign_out_reason_name=(
            session.sign_out_reason_type.name if session.sign_out_reason_type else None
        ),
        is_current=session.session_identifier == current_session_identifier,
    )


def get_known_device_key(session: UserSessions) -> str:
    if session.fingerprint_hash:
        return f"fingerprint:{session.fingerprint_hash}"

    fallback_parts = [
        session.device_label or "unknown-device",
        session.browser or "unknown-browser",
        session.operating_system or "unknown-os",
        session.device_type or "unknown-type",
    ]
    return f"derived:{'|'.join(fallback_parts)}"


@user_sessions_router.get(
    "/user-sessions/current/status",
    response_model=CurrentSessionStatusResponse,
)
def get_current_session_status(
    _: Users = Depends(get_current_user),
    token: str = Depends(oauth2_scheme),
):
    current_session_identifier = get_session_identifier_from_token(token)
    if not current_session_identifier:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session identifier is missing from token",
        )

    return CurrentSessionStatusResponse(
        session_identifier=current_session_identifier,
        is_active=True,
    )


@user_sessions_router.get(
    "/user-sessions",
    response_model=UserSessionsResponse,
)
def list_user_sessions(
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user),
    token: str = Depends(oauth2_scheme),
):
    current_session_identifier = get_session_identifier_from_token(token)
    sessions = (
        db.query(UserSessions)
        .filter(UserSessions.user_id == current_user.id)
        .order_by(UserSessions.last_seen_at.desc(), UserSessions.signed_in_at.desc())
        .all()
    )

    serialized_sessions = [
        serialize_session(
            session,
            current_session_identifier=current_session_identifier,
        )
        for session in sessions
    ]

    grouped_sessions: dict[str, list[UserSessions]] = defaultdict(list)
    for session in sessions:
        grouped_sessions[get_known_device_key(session)].append(session)

    known_devices: list[KnownDeviceSummary] = []
    for device_key, device_sessions in grouped_sessions.items():
        ordered_sessions = sorted(
            device_sessions,
            key=lambda session: (session.last_seen_at, session.signed_in_at),
            reverse=True,
        )
        newest_session = ordered_sessions[0]
        known_devices.append(
            KnownDeviceSummary(
                device_key=device_key,
                device_label=newest_session.device_label,
                device_type=newest_session.device_type,
                browser=newest_session.browser,
                operating_system=newest_session.operating_system,
                session_count=len(device_sessions),
                active_session_count=sum(
                    1 for session in device_sessions if session.is_active
                ),
                signed_in_at_first=min(
                    session.signed_in_at for session in device_sessions
                ),
                last_seen_at=max(session.last_seen_at for session in device_sessions),
                is_current_device=any(
                    session.session_identifier == current_session_identifier
                    for session in device_sessions
                ),
            )
        )

    known_devices.sort(
        key=lambda device: (device.is_current_device, device.last_seen_at),
        reverse=True,
    )

    return UserSessionsResponse(
        current_session_identifier=current_session_identifier,
        sessions=serialized_sessions,
        known_devices=known_devices,
    )


@user_sessions_router.delete("/user-sessions/{session_identifier}")
def revoke_user_session(
    session_identifier: str,
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user),
    token: str = Depends(oauth2_scheme),
):
    current_session_identifier = get_session_identifier_from_token(token)
    if session_identifier == current_session_identifier:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The current session cannot be closed from this endpoint",
        )

    session = (
        db.query(UserSessions)
        .filter(
            UserSessions.session_identifier == session_identifier,
            UserSessions.user_id == current_user.id,
        )
        .first()
    )
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    mark_session_signed_out(
        db,
        session_identifier=session_identifier,
        reason_name="forced_logout",
    )
    db.commit()

    return {
        "message": "Session closed",
        "session_identifier": session_identifier,
    }


@user_sessions_router.post("/logout")
def logout_current_session(
    payload: SessionSignOutRequest,
    db: Session = Depends(get_db),
    _: Users = Depends(get_current_user),
    token: str = Depends(oauth2_scheme),
):
    session_identifier = get_session_identifier_from_token(token)
    if not session_identifier:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session identifier is missing from token",
        )

    session = mark_session_signed_out(
        db,
        session_identifier=session_identifier,
        reason_name=payload.sign_out_reason_name,
        fingerprint_hash=payload.fingerprint_hash,
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    db.commit()

    return {"message": "Session signed out", "session_identifier": session.session_identifier}


@user_sessions_router.post("/logout/expired")
def logout_expired_session(
    payload: ExpiredSessionSignOutRequest,
    db: Session = Depends(get_db),
):
    session = mark_session_signed_out(
        db,
        session_identifier=payload.session_identifier,
        reason_name=payload.sign_out_reason_name,
        fingerprint_hash=payload.fingerprint_hash,
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    db.commit()

    return {"message": "Expired session recorded", "session_identifier": session.session_identifier}
