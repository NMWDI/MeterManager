from datetime import date, datetime, time

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi_pagination import LimitOffsetPage
from fastapi_pagination.ext.sqlalchemy import paginate
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from api.enums import ScopedUser
from api.models.main_models import Notifications, NotificationTypeLU, Users
from api.schemas.notification_schemas import (
    NotificationCreateRequest,
    NotificationCreateResult,
    Notification,
    NotificationReadUpdate,
    NotificationType,
    NotificationUnreadCount,
)
from api.security import get_current_user
from api.session import get_db

notifications_router = APIRouter()


@notifications_router.get(
    "/notifications",
    dependencies=[Depends(ScopedUser.Read)],
    response_model=LimitOffsetPage[Notification],
    tags=["Notifications"],
)
def get_notifications(
    q: str | None = None,
    is_read: bool | None = None,
    notification_type_id: list[int] | None = Query(None),
    created_from: date | None = None,
    created_to: date | None = None,
    db: Session = Depends(get_db),
    user: Users = Depends(get_current_user),
):
    query_statement = (
        select(Notifications)
        .options(
            joinedload(Notifications.notification_type),
            joinedload(Notifications.creator),
        )
        .where(Notifications.user_id == user.id)
        .order_by(Notifications.created_at.desc(), Notifications.id.desc())
    )

    if q:
        ilike_term = f"%{q.strip()}%"
        query_statement = query_statement.where(
            Notifications.title.ilike(ilike_term)
            | Notifications.message.ilike(ilike_term)
            | Notifications.link.ilike(ilike_term)
        )

    if is_read is not None:
        query_statement = query_statement.where(Notifications.is_read == is_read)

    if notification_type_id:
        query_statement = query_statement.where(
            Notifications.notification_type_id.in_(notification_type_id)
        )

    if created_from is not None:
        query_statement = query_statement.where(
            Notifications.created_at >= datetime.combine(created_from, time.min)
        )

    if created_to is not None:
        query_statement = query_statement.where(
            Notifications.created_at <= datetime.combine(created_to, time.max)
        )

    return paginate(db, query_statement)


@notifications_router.get(
    "/notification_types",
    dependencies=[Depends(ScopedUser.Read)],
    response_model=list[NotificationType],
    tags=["Notifications"],
)
def get_notification_types(db: Session = Depends(get_db)):
    return db.scalars(
        select(NotificationTypeLU).order_by(func.lower(NotificationTypeLU.name))
    ).all()


@notifications_router.get(
    "/notifications/unread_count",
    dependencies=[Depends(ScopedUser.Read)],
    response_model=NotificationUnreadCount,
    tags=["Notifications"],
)
def get_unread_notification_count(
    db: Session = Depends(get_db),
    user: Users = Depends(get_current_user),
):
    unread_count = db.scalar(
        select(func.count(Notifications.id)).where(
            Notifications.user_id == user.id, Notifications.is_read.is_(False)
        )
    )

    return {"unread_count": unread_count or 0}


@notifications_router.post(
    "/notifications",
    dependencies=[Depends(ScopedUser.Admin)],
    response_model=NotificationCreateResult,
    tags=["Notifications"],
)
def create_notifications(
    payload: NotificationCreateRequest,
    db: Session = Depends(get_db),
    user: Users = Depends(get_current_user),
):
    user_ids = set(payload.user_ids)

    if payload.role_ids:
        role_user_ids = db.scalars(
            select(Users.id).where(
                Users.user_role_id.in_(payload.role_ids), Users.disabled.is_(False)
            )
        ).all()
        user_ids.update(role_user_ids)

    if user_ids:
        valid_user_ids = db.scalars(
            select(Users.id).where(Users.id.in_(user_ids), Users.disabled.is_(False))
        ).all()
        user_ids = set(valid_user_ids)

    if not user_ids:
        raise HTTPException(
            status_code=400,
            detail="At least one active user or role recipient is required",
        )

    notification_type_exists = db.scalar(
        select(NotificationTypeLU.id).where(
            NotificationTypeLU.id == payload.notification_type_id
        )
    )
    if not notification_type_exists:
        raise HTTPException(status_code=404, detail="Notification type not found")

    notifications = [
        Notifications(
            user_id=user_id,
            notification_type_id=payload.notification_type_id,
            created_by=user.id,
            title=payload.title.strip(),
            message=payload.message.strip(),
            link=payload.link.strip() if payload.link else None,
        )
        for user_id in user_ids
    ]

    db.add_all(notifications)
    db.commit()

    return {"created_count": len(notifications)}


@notifications_router.patch(
    "/notifications",
    dependencies=[Depends(ScopedUser.Read)],
    response_model=Notification,
    tags=["Notifications"],
)
def update_notification_read_status(
    payload: NotificationReadUpdate,
    db: Session = Depends(get_db),
    user: Users = Depends(get_current_user),
):
    notification = db.scalar(
        select(Notifications)
        .options(
            joinedload(Notifications.notification_type),
            joinedload(Notifications.creator),
        )
        .where(Notifications.id == payload.id, Notifications.user_id == user.id)
    )

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    notification.is_read = payload.is_read
    notification.read_at = datetime.now() if payload.is_read else None

    db.commit()
    db.refresh(notification)

    return notification
