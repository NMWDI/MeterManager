from api.schemas.base import ORMBase


class RedirectPageUpdate(ORMBase):
    redirect_page: str


class DisplayNameUpdate(ORMBase):
    display_name: str


class PasswordResetRequest(ORMBase):
    current_password: str
    new_password: str
