from api.schemas.base import ORMBase
from pydantic import BaseModel


class SecurityScope(ORMBase):
    scope_string: str
    description: str | None = None


class UserRole(ORMBase):
    name: str
    security_scopes: list[SecurityScope] | None = None


class UpdatedUserPassword(ORMBase):
    user_id: int
    new_password: str


class UpdatedUser(ORMBase):
    id: int
    username: str
    email: str
    full_name: str
    disabled: bool
    user_role_id: int


class NewUser(ORMBase):
    username: str
    email: str
    full_name: str
    disabled: bool
    user_role_id: int
    password: str


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


class Token(BaseModel):
    access_token: str
    token_type: str
    user: User


class TokenData(ORMBase):
    username: str | None = None


class UserInDB(User):
    hashed_password: str


# ============= EOF =============================================
