from api.schemas.base import ORMBase
from pydantic import BaseModel


class RedirectPageUpdate(ORMBase):
    redirect_page: str


class DisplayNameUpdate(ORMBase):
    display_name: str


class PasswordResetRequest(ORMBase):
    current_password: str
    new_password: str


class PasswordEvaluateRequest(BaseModel):
    password: str


class PasswordEvaluationResponse(BaseModel):
    score: int
    label: str
    is_policy_compliant: bool
    missing_requirements: list[str]
    compromised_count: int | None = None
    compromised_checked_at: str | None = None
    compromised_check_error: str | None = None


class PasswordStatusResponse(BaseModel):
    password_changed_at: str | None = None
    password_strength_score: int | None = None
    password_strength_label: str | None = None
    password_policy_compliant: bool | None = None
    password_compromised_checked_at: str | None = None
    password_compromised_count: int | None = None
