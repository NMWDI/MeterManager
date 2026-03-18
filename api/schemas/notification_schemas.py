from datetime import datetime

from api.schemas.base import ORMBase


class NotificationType(ORMBase):
    name: str
    description: str | None = None


class Notification(ORMBase):
    user_id: int
    notification_type_id: int
    title: str
    message: str
    link: str | None = None
    is_read: bool
    created_at: datetime
    read_at: datetime | None = None
    notification_type: NotificationType


class NotificationUnreadCount(ORMBase):
    unread_count: int


class NotificationCreateRequest(ORMBase):
    role_ids: list[int] = []
    user_ids: list[int] = []
    notification_type_id: int
    title: str
    message: str
    link: str | None = None


class NotificationCreateResult(ORMBase):
    created_count: int


class NotificationReadUpdate(ORMBase):
    id: int
    is_read: bool
