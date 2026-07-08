from datetime import datetime

from api.schemas.base import ORMBase
from pydantic import BaseModel, Field


class SecurityScope(ORMBase):
    scope_string: str
    description: str | None = None


class UserRole(ORMBase):
    name: str
    security_scopes: list[SecurityScope] | None = None


class UpdatedUserPassword(ORMBase):
    user_id: int
    new_password: str


class GeneratedPasswordResponse(BaseModel):
    password: str


class UpdatedUser(ORMBase):
    id: int
    username: str
    email: str
    full_name: str
    disabled: bool
    user_role_id: int


class UpdatedServiceAccount(ORMBase):
    full_name: str | None = None
    display_name: str | None = None
    disabled: bool | None = None
    user_role_id: int | None = None


class NewUser(ORMBase):
    username: str
    email: str
    full_name: str
    display_name: str
    disabled: bool
    user_role_id: int
    password: str


class NewServiceAccount(ORMBase):
    username: str
    full_name: str
    display_name: str | None = None
    user_role_id: int
    disabled: bool = False


class ServiceAccountApiKey(ORMBase):
    key_identifier: str
    key_prefix: str
    created_at: datetime
    last_used_at: datetime | None = None
    revoked_at: datetime | None = None


class User(ORMBase):
    username: str | None = None
    email: str | None = None
    full_name: str | None = None
    disabled: bool

    user_role_id: int

    user_role: UserRole | None = None

    display_name: str | None = None
    redirect_page: str | None = None
    avatar_img: str | None = None
    password_changed_at: datetime | None = None
    password_strength_score: int | None = None
    password_strength_label: str | None = None
    password_policy_compliant: bool | None = None
    password_compromised_checked_at: datetime | None = None
    password_compromised_count: int | None = None


class ServiceAccount(User):
    is_service_account: bool
    api_keys: list[ServiceAccountApiKey] = Field(default_factory=list)


class ServiceAccountWithKey(ServiceAccount):
    api_key: str


class ImpersonationContext(BaseModel):
    impersonator_user_id: int
    impersonator_full_name: str | None = None
    impersonator_display_name: str | None = None


class Token(BaseModel):
    access_token: str
    token_type: str
    user: User
    session_identifier: str | None = None
    impersonation: ImpersonationContext | None = None


class TokenData(ORMBase):
    username: str | None = None


class UserInDB(User):
    hashed_password: str


# ============= EOF =============================================
