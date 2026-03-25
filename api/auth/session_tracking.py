from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional
from uuid import uuid4

from fastapi import Request
from sqlalchemy.orm import Session

from api.models.user import SignOutReasonTypeLU, UserSessions, Users

LAST_SEEN_UPDATE_INTERVAL = timedelta(minutes=5)


def normalize_header_value(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None

    normalized = value.strip()
    return normalized or None


def extract_client_ip(request: Request) -> Optional[str]:
    forwarded_for = normalize_header_value(request.headers.get("x-forwarded-for"))
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()

    real_ip = normalize_header_value(request.headers.get("x-real-ip"))
    if real_ip:
        return real_ip

    if request.client:
        return request.client.host

    return None


def parse_browser(user_agent: Optional[str]) -> Optional[str]:
    if not user_agent:
        return None

    browser_patterns = [
        ("Edg/", "Microsoft Edge"),
        ("OPR/", "Opera"),
        ("Opera", "Opera"),
        ("SamsungBrowser/", "Samsung Internet"),
        ("CriOS/", "Chrome (iOS)"),
        ("Chrome/", "Chrome"),
        ("Chromium/", "Chromium"),
        ("FxiOS/", "Firefox (iOS)"),
        ("Firefox/", "Firefox"),
        ("Version/", "Safari"),
        ("MSIE ", "Internet Explorer"),
        ("Trident/", "Internet Explorer"),
    ]

    for token, browser_name in browser_patterns:
        if token in user_agent:
            return browser_name

    return "Unknown Browser"


def parse_operating_system(user_agent: Optional[str]) -> Optional[str]:
    if not user_agent:
        return None

    os_patterns = [
        ("Windows NT", "Windows"),
        ("Android", "Android"),
        ("iPhone", "iOS"),
        ("iPad", "iPadOS"),
        ("Mac OS X", "macOS"),
        ("CrOS", "ChromeOS"),
        ("Linux", "Linux"),
    ]

    for token, os_name in os_patterns:
        if token in user_agent:
            return os_name

    return "Unknown OS"


def parse_device_type(user_agent: Optional[str]) -> Optional[str]:
    if not user_agent:
        return None

    lowered_user_agent = user_agent.lower()
    if "ipad" in lowered_user_agent or "tablet" in lowered_user_agent:
        return "Tablet"
    if "mobile" in lowered_user_agent or "iphone" in lowered_user_agent:
        return "Mobile"

    return "Desktop"


def build_device_label(
    browser: Optional[str], operating_system: Optional[str], device_type: Optional[str]
) -> Optional[str]:
    if browser and operating_system:
        return f"{browser} on {operating_system}"
    if browser and device_type:
        return f"{browser} ({device_type})"
    return browser or operating_system or device_type


def create_user_session(db: Session, user: Users, request: Request) -> UserSessions:
    user_agent = normalize_header_value(request.headers.get("user-agent"))
    browser = normalize_header_value(request.headers.get("x-browser")) or parse_browser(
        user_agent
    )
    operating_system = normalize_header_value(
        request.headers.get("x-operating-system")
    ) or parse_operating_system(user_agent)
    device_type = normalize_header_value(
        request.headers.get("x-device-type")
    ) or parse_device_type(user_agent)
    device_label = normalize_header_value(
        request.headers.get("x-device-label")
    ) or build_device_label(browser, operating_system, device_type)
    fingerprint_hash = normalize_header_value(
        request.headers.get("x-device-fingerprint")
    )

    session = UserSessions(
        user_id=user.id,
        session_identifier=str(uuid4()),
        ip_address=extract_client_ip(request),
        user_agent=user_agent,
        device_label=device_label,
        device_type=device_type,
        browser=browser,
        operating_system=operating_system,
        fingerprint_hash=fingerprint_hash,
        signed_in_at=datetime.utcnow(),
        last_seen_at=datetime.utcnow(),
        is_active=True,
    )

    db.add(session)
    db.flush()

    return session


def get_sign_out_reason(
    db: Session, reason_name: Optional[str]
) -> Optional[SignOutReasonTypeLU]:
    normalized_reason_name = normalize_header_value(reason_name) or "unknown"
    sign_out_reason = (
        db.query(SignOutReasonTypeLU)
        .filter(SignOutReasonTypeLU.name == normalized_reason_name)
        .first()
    )

    if sign_out_reason:
        return sign_out_reason

    return (
        db.query(SignOutReasonTypeLU)
        .filter(SignOutReasonTypeLU.name == "unknown")
        .first()
    )


def mark_session_signed_out(
    db: Session,
    session_identifier: str,
    reason_name: Optional[str],
    fingerprint_hash: Optional[str] = None,
) -> Optional[UserSessions]:
    session = (
        db.query(UserSessions)
        .filter(UserSessions.session_identifier == session_identifier)
        .first()
    )
    if not session:
        return None

    if (
        fingerprint_hash
        and session.fingerprint_hash
        and session.fingerprint_hash != fingerprint_hash
    ):
        return None

    if session.signed_out_at is not None:
        return session

    sign_out_reason = get_sign_out_reason(db, reason_name)

    session.signed_out_at = datetime.utcnow()
    session.last_seen_at = session.signed_out_at
    session.is_active = False
    session.sign_out_reason_type_id = sign_out_reason.id if sign_out_reason else None
    db.add(session)

    return session


def touch_user_session(db: Session, session_identifier: Optional[str]) -> None:
    if not session_identifier:
        return

    session = (
        db.query(UserSessions)
        .filter(
            UserSessions.session_identifier == session_identifier,
            UserSessions.is_active.is_(True),
        )
        .first()
    )
    if not session:
        return

    now = datetime.utcnow()
    if session.last_seen_at and now - session.last_seen_at < LAST_SEEN_UPDATE_INTERVAL:
        return

    session.last_seen_at = now
    db.add(session)
    db.commit()
