from typing import List, Optional

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Table, func
from sqlalchemy.orm import Mapped, deferred, mapped_column, relationship

from api.models.base import Base


class Users(Base):
    __tablename__ = "Users"

    full_name: Mapped[str] = mapped_column(String)
    disabled: Mapped[bool] = mapped_column(Boolean, default=False)
    username: Mapped[str] = deferred(mapped_column(String, nullable=False))
    email: Mapped[str] = deferred(mapped_column(String))
    hashed_password: Mapped[str] = deferred(mapped_column(String, nullable=False))
    user_role_id: Mapped[int] = deferred(
        mapped_column(Integer, ForeignKey("UserRoles.id"), nullable=False)
    )

    user_role: Mapped["UserRoles"] = relationship("UserRoles")
    display_name: Mapped[str] = mapped_column(String, nullable=True)
    redirect_page: Mapped[str] = mapped_column(String, nullable=True, default="/")
    avatar_img: Mapped[str] = mapped_column(String, nullable=True)
    notifications: Mapped[List["Notifications"]] = relationship(
        "Notifications",
        back_populates="user",
        cascade="all, delete-orphan",
        foreign_keys="Notifications.user_id",
    )
    created_notifications: Mapped[List["Notifications"]] = relationship(
        "Notifications",
        back_populates="creator",
        foreign_keys="Notifications.created_by",
    )
    user_sessions: Mapped[List["UserSessions"]] = relationship(
        "UserSessions",
        back_populates="user",
        cascade="all, delete-orphan",
    )


class SignOutReasonTypeLU(Base):
    __tablename__ = "sign_out_reason_type_lu"

    name: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    description: Mapped[Optional[str]] = mapped_column(String)
    user_sessions: Mapped[List["UserSessions"]] = relationship(
        "UserSessions", back_populates="sign_out_reason_type"
    )


class UserSessions(Base):
    __tablename__ = "user_sessions"

    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("Users.id", ondelete="CASCADE", onupdate="CASCADE"), index=True
    )
    session_identifier: Mapped[str] = mapped_column(
        String(36), nullable=False, unique=True, index=True
    )
    ip_address: Mapped[Optional[str]] = mapped_column(String(255))
    user_agent: Mapped[Optional[str]] = mapped_column(String)
    device_label: Mapped[Optional[str]] = mapped_column(String(255))
    device_type: Mapped[Optional[str]] = mapped_column(String(100))
    browser: Mapped[Optional[str]] = mapped_column(String(100))
    operating_system: Mapped[Optional[str]] = mapped_column(String(100))
    fingerprint_hash: Mapped[Optional[str]] = mapped_column(String(128), index=True)
    signed_in_at: Mapped[DateTime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), index=True
    )
    last_seen_at: Mapped[DateTime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), index=True
    )
    signed_out_at: Mapped[Optional[DateTime]] = mapped_column(DateTime, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)
    sign_out_reason_type_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey(
            "sign_out_reason_type_lu.id", ondelete="RESTRICT", onupdate="CASCADE"
        ),
        index=True,
    )

    user: Mapped["Users"] = relationship("Users", back_populates="user_sessions")
    sign_out_reason_type: Mapped[Optional["SignOutReasonTypeLU"]] = relationship(
        "SignOutReasonTypeLU", back_populates="user_sessions"
    )


class NotificationTypeLU(Base):
    __tablename__ = "notification_type_lu"

    name: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    description: Mapped[Optional[str]] = mapped_column(String)
    notifications: Mapped[List["Notifications"]] = relationship(
        "Notifications", back_populates="notification_type"
    )


class Notifications(Base):
    __tablename__ = "notifications"

    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("Users.id", ondelete="CASCADE", onupdate="CASCADE"), index=True
    )
    notification_type_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey(
            "notification_type_lu.id", ondelete="RESTRICT", onupdate="CASCADE"
        ),
        index=True,
    )
    created_by: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("Users.id", ondelete="SET NULL", onupdate="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(String, nullable=False)
    link: Mapped[Optional[str]] = mapped_column(String(500))
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
    created_at: Mapped[DateTime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), index=True
    )
    read_at: Mapped[Optional[DateTime]] = mapped_column(DateTime)

    user: Mapped["Users"] = relationship(
        "Users", back_populates="notifications", foreign_keys=[user_id]
    )
    creator: Mapped[Optional["Users"]] = relationship(
        "Users", back_populates="created_notifications", foreign_keys=[created_by]
    )
    notification_type: Mapped["NotificationTypeLU"] = relationship(
        "NotificationTypeLU", back_populates="notifications"
    )


ScopesRoles = Table(
    "ScopesRoles",
    Base.metadata,
    Column("security_scope_id", ForeignKey("SecurityScopes.id"), nullable=False),
    Column("user_role_id", ForeignKey("UserRoles.id"), nullable=False),
)


class SecurityScopes(Base):
    __tablename__ = "SecurityScopes"
    scope_string: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(String)


class UserRoles(Base):
    __tablename__ = "UserRoles"
    name: Mapped[str] = mapped_column(String, nullable=False)
    security_scopes: Mapped[List["SecurityScopes"]] = relationship(
        secondary=ScopesRoles
    )
