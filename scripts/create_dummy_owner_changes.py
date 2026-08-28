#!/usr/bin/env python3
# ruff: noqa: E402
"""Create dummy meter owner-change requests for UI testing.

Run from the repository root. Set APPDB_ENV first if you normally use one, for
example:

    APPDB_ENV=.env_devserver uv run python scripts/create_dummy_owner_changes.py --clear
"""

from __future__ import annotations

import argparse
import sys
from datetime import datetime, timedelta
from itertools import cycle
from pathlib import Path

from sqlalchemy import delete, select
from sqlalchemy.orm import joinedload

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT))

from api.models import (
    MeterOwnerChangeRequests,
    Meters,
    NotificationTypeLU,
    Notifications,
    SecurityScopes,
    UserRoles,
    Users,
)
from api.session import SessionLocal


DUMMY_OSE_METER_ID_START = 900_000_000
DUMMY_OSE_METER_ID_END = 900_999_999


CONTACT_NAMES = [
    "Rio Farms LLC",
    "Sanchez Family Trust",
    "Pecos Valley Growers",
    "North Gate Dairy",
    "Luna Irrigation Co.",
    "Mesa Ag Partners",
]

STREETS = [
    "101 Canal Rd",
    "2458 County Line Rd",
    "77 Orchard Loop",
    "910 South Pump Station Rd",
    "34 Lateral B",
    "682 Cottonwood Ave",
]


def contact_snapshot(contact) -> dict[str, str | None]:
    return {
        "name": contact.name,
        "address": contact.address,
    }


def existing_contacts(meter: Meters) -> list[dict[str, str | None]]:
    contacts = [contact_snapshot(contact) for contact in meter.contacts]
    contacts = [contact for contact in contacts if any(contact.values())]
    if contacts:
        return contacts

    if meter.contact_name:
        return [
            {
                "name": meter.contact_name,
                "address": None,
            }
        ]

    return []


def new_contacts_for(index: int) -> list[dict[str, str | None]]:
    primary_name = CONTACT_NAMES[index % len(CONTACT_NAMES)]
    secondary_name = CONTACT_NAMES[(index + 2) % len(CONTACT_NAMES)]
    return [
        {
            "name": primary_name,
            "address": f"{STREETS[index % len(STREETS)]}, Artesia, NM 88210",
        },
        {
            "name": secondary_name,
            "address": None,
        },
    ]


def admin_user_ids(db) -> list[int]:
    return db.scalars(
        select(Users.id)
        .join(UserRoles, Users.user_role_id == UserRoles.id)
        .join(UserRoles.security_scopes)
        .where(SecurityScopes.scope_string == "admin", Users.disabled.is_(False))
    ).all()


def first_enabled_user_id(db) -> int | None:
    return db.scalar(
        select(Users.id).where(Users.disabled.is_(False)).order_by(Users.id).limit(1)
    )


def owner_change_notification_type_id(db) -> int | None:
    return db.scalar(
        select(NotificationTypeLU.id).where(NotificationTypeLU.name == "owner_change")
    )


def clear_dummy_rows(db) -> tuple[int, int]:
    dummy_request_ids = db.scalars(
        select(MeterOwnerChangeRequests.id).where(
            MeterOwnerChangeRequests.ose_meter_id.between(
                DUMMY_OSE_METER_ID_START,
                DUMMY_OSE_METER_ID_END,
            )
        )
    ).all()

    deleted_notifications = 0
    if dummy_request_ids:
        links = [
            f"/notifications?owner_change_request_id={request_id}"
            for request_id in dummy_request_ids
        ]
        deleted_notifications = (
            db.execute(delete(Notifications).where(Notifications.link.in_(links)))
            .rowcount
            or 0
        )

    deleted_requests = (
        db.execute(
            delete(MeterOwnerChangeRequests).where(
                MeterOwnerChangeRequests.ose_meter_id.between(
                    DUMMY_OSE_METER_ID_START,
                    DUMMY_OSE_METER_ID_END,
                )
            )
        ).rowcount
        or 0
    )
    return deleted_requests, deleted_notifications


def create_notifications(db, change_requests, created_by: int | None) -> int:
    notification_type_id = owner_change_notification_type_id(db)
    user_ids = admin_user_ids(db)
    if not notification_type_id or not user_ids:
        return 0

    notifications = []
    for change_request in change_requests:
        if change_request.status not in {"pending", "partially_accepted"}:
            continue
        for user_id in user_ids:
            notifications.append(
                Notifications(
                    user_id=user_id,
                    notification_type_id=notification_type_id,
                    created_by=created_by,
                    title=f"Owner Change: Meter {change_request.serial_number}",
                    message=(
                        "OSE owner or contact information differs from Meter Manager. "
                        "Review and accept the selected changes."
                    ),
                    link=f"/notifications?owner_change_request_id={change_request.id}",
                )
            )

    db.add_all(notifications)
    return len(notifications)


def create_dummy_owner_changes(
    count: int,
    clear: bool,
    include_resolved: bool,
    with_notifications: bool,
) -> None:
    with SessionLocal() as db:
        if clear:
            deleted_requests, deleted_notifications = clear_dummy_rows(db)
            print(
                "Cleared "
                f"{deleted_requests} dummy owner-change request(s) and "
                f"{deleted_notifications} notification(s)."
            )

        meters = db.scalars(
            select(Meters)
            .options(joinedload(Meters.contacts))
            .order_by(Meters.id)
            .limit(count)
        ).unique().all()
        if not meters:
            raise SystemExit("No meters found. Seed or import meters before running this.")

        created_by = first_enabled_user_id(db)
        now = datetime.now()
        statuses = ["pending", "partially_accepted"]
        if include_resolved:
            statuses.extend(["accepted", "rejected"])

        created_requests = []
        for index, (meter, status) in enumerate(zip(meters, cycle(statuses))):
            old_water_users = meter.water_users or meter.meter_owner or "PVACD"
            new_water_users = f"{CONTACT_NAMES[index % len(CONTACT_NAMES)]}; Test Owner {index + 1}"
            old_contacts = existing_contacts(meter)
            if not old_contacts:
                old_contacts = [
                    {
                        "name": meter.meter_owner or "PVACD",
                        "address": None,
                    }
                ]

            resolved = status in {"accepted", "rejected"}
            change_request = MeterOwnerChangeRequests(
                meter_id=meter.id,
                serial_number=meter.serial_number,
                ose_meter_id=DUMMY_OSE_METER_ID_START + index,
                old_water_users=old_water_users,
                new_water_users=new_water_users,
                old_contacts=old_contacts,
                new_contacts=new_contacts_for(index),
                status=status,
                created_by=created_by,
                resolved_by=created_by if resolved else None,
                created_at=now - timedelta(hours=index),
                resolved_at=now - timedelta(minutes=index * 10) if resolved else None,
            )
            db.add(change_request)
            created_requests.append(change_request)

        db.flush()
        notification_count = (
            create_notifications(db, created_requests, created_by)
            if with_notifications
            else 0
        )
        db.commit()

    print(
        f"Created {len(created_requests)} dummy owner-change request(s) "
        f"and {notification_count} notification(s)."
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Create dummy meter owner-change requests for UI testing."
    )
    parser.add_argument(
        "--count",
        type=int,
        default=8,
        help="Number of owner-change requests to create. Defaults to 8.",
    )
    parser.add_argument(
        "--clear",
        action="store_true",
        help="Delete previously-created dummy owner-change requests first.",
    )
    parser.add_argument(
        "--include-resolved",
        action="store_true",
        help="Also create accepted and rejected rows. The default UI query hides these.",
    )
    parser.add_argument(
        "--no-notifications",
        action="store_true",
        help="Create owner-change requests without matching notification rows.",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    if args.count < 1:
        raise SystemExit("--count must be at least 1")

    create_dummy_owner_changes(
        count=args.count,
        clear=args.clear,
        include_resolved=args.include_resolved,
        with_notifications=not args.no_notifications,
    )
