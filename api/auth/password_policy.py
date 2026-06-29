from __future__ import annotations

import hashlib
import re
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone

from api.models.user import Users


MIN_PASSWORD_LENGTH = 12
HIBP_RANGE_API_URL = "https://api.pwnedpasswords.com/range"
HIBP_USER_AGENT = "WaterManagerDB password checker"
HIBP_TIMEOUT_SECONDS = 3


@dataclass(frozen=True)
class PasswordEvaluation:
    score: int
    label: str
    is_policy_compliant: bool
    missing_requirements: list[str]
    compromised_count: int | None = None
    compromised_checked_at: datetime | None = None
    compromised_check_error: str | None = None


def evaluate_password_strength(
    password: str,
    user: Users | None = None,
    compromised_count: int | None = None,
    compromised_checked_at: datetime | None = None,
    compromised_check_error: str | None = None,
) -> PasswordEvaluation:
    missing_requirements = []

    if len(password) < MIN_PASSWORD_LENGTH:
        missing_requirements.append(
            f"Use at least {MIN_PASSWORD_LENGTH} characters."
        )
    if not re.search(r"[a-z]", password):
        missing_requirements.append("Add a lowercase letter.")
    if not re.search(r"[A-Z]", password):
        missing_requirements.append("Add an uppercase letter.")
    if not re.search(r"\d", password):
        missing_requirements.append("Add a number.")
    if not re.search(r"[^A-Za-z0-9]", password):
        missing_requirements.append("Add a symbol.")

    lower_password = password.lower()
    for value, label in _user_identifiers(user):
        if value and len(value) >= 3 and value.lower() in lower_password:
            missing_requirements.append(f"Do not include your {label}.")

    score = 0
    score += min(len(password), 16) // 4
    score += 1 if re.search(r"[a-z]", password) else 0
    score += 1 if re.search(r"[A-Z]", password) else 0
    score += 1 if re.search(r"\d", password) else 0
    score += 1 if re.search(r"[^A-Za-z0-9]", password) else 0
    score += 1 if len(password) >= 16 else 0
    score = min(score, 5)

    if missing_requirements:
        score = min(score, 2)

    label = "Weak"
    if score >= 5:
        label = "Strong"
    elif score >= 3:
        label = "Moderate"

    return PasswordEvaluation(
        score=score,
        label=label,
        is_policy_compliant=not missing_requirements,
        missing_requirements=missing_requirements,
        compromised_count=compromised_count,
        compromised_checked_at=compromised_checked_at,
        compromised_check_error=compromised_check_error,
    )


def check_pwned_password(password: str) -> tuple[int | None, datetime, str | None]:
    checked_at = datetime.now(timezone.utc)
    password_hash = hashlib.sha1(password.encode("utf-8")).hexdigest().upper()
    prefix = password_hash[:5]
    suffix = password_hash[5:]
    request = urllib.request.Request(
        f"{HIBP_RANGE_API_URL}/{prefix}",
        headers={
            "Add-Padding": "true",
            "User-Agent": HIBP_USER_AGENT,
        },
    )

    try:
        with urllib.request.urlopen(request, timeout=HIBP_TIMEOUT_SECONDS) as response:
            body = response.read().decode("utf-8")
    except (OSError, urllib.error.URLError, TimeoutError) as exc:
        return None, checked_at, str(exc)

    for line in body.splitlines():
        found_suffix, _, count = line.partition(":")
        if found_suffix == suffix:
            try:
                return int(count), checked_at, None
            except ValueError:
                return None, checked_at, "Unexpected compromised password response."

    return 0, checked_at, None


def evaluate_password(
    password: str,
    user: Users | None = None,
    include_compromised_check: bool = False,
) -> PasswordEvaluation:
    compromised_count = None
    compromised_checked_at = None
    compromised_check_error = None

    if include_compromised_check:
        compromised_count, compromised_checked_at, compromised_check_error = (
            check_pwned_password(password)
        )

    return evaluate_password_strength(
        password=password,
        user=user,
        compromised_count=compromised_count,
        compromised_checked_at=compromised_checked_at,
        compromised_check_error=compromised_check_error,
    )


def apply_password_evaluation(user: Users, evaluation: PasswordEvaluation) -> None:
    user.password_strength_score = evaluation.score
    user.password_strength_label = evaluation.label
    user.password_policy_compliant = evaluation.is_policy_compliant

    if evaluation.compromised_checked_at is not None:
        user.password_compromised_checked_at = evaluation.compromised_checked_at
        user.password_compromised_count = evaluation.compromised_count


def _user_identifiers(user: Users | None) -> list[tuple[str | None, str]]:
    if user is None:
        return []

    values: list[tuple[str | None, str]] = [
        (user.username, "username"),
        (user.email, "email"),
        (user.full_name, "name"),
        (user.display_name, "display name"),
    ]

    if user.email and "@" in user.email:
        values.append((user.email.split("@", 1)[0], "email"))

    return values
