from datetime import datetime, timezone, timedelta
import secrets
import string

from fastapi import Depends, APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload, undefer
from sqlalchemy import select
from typing import List

from api.models.user import ServiceAccountApiKeys, Users, UserRoles, SecurityScopes

from api.schemas import security
from api.schemas import admin
from api.session import get_db
from api.routes.utils import _patch
from api.auth.dependencies import ScopedUser
from api.auth.session_tracking import create_user_session
from api.auth.password_policy import apply_password_evaluation, evaluate_password
from api.security import (
    create_access_token,
    create_service_account_api_key,
    ACCESS_TOKEN_EXPIRE_HOURS,
    get_password_hash,
)
from api.config import settings

from pathlib import Path
from google.cloud import storage
from dotenv import load_dotenv

import os
import re
import subprocess
import datetime as dt

admin_router = APIRouter()

BUCKET_NAME = os.getenv("GCP_BUCKET_NAME", "")
BACKUP_PREFIX = os.getenv("GCP_BACKUP_PREFIX", "")
BACKUP_RETENTION_DAYS = int(os.getenv("BACKUP_RETENTION_DAYS", "30"))
load_dotenv(os.getenv("APPDB_ENV", ".env"))
DATABASE_URL = os.getenv("DATABASE_URL", "")
PASSWORD_GENERATION_ATTEMPTS = 8
PASSWORD_GENERATION_LENGTH = 20
PASSWORD_SYMBOLS = "!@#$%^&*()-_=+[]{}:,.?"
BACKUP_FILENAME_DATE_RE = re.compile(r"^backup-(\d{4}-\d{2}-\d{2})-\d+\.dump$")


def _backup_filename_date(file_name: str) -> dt.date | None:
    match = BACKUP_FILENAME_DATE_RE.match(file_name)
    if not match:
        return None

    try:
        return dt.date.fromisoformat(match.group(1))
    except ValueError:
        return None


def _backup_sort_key(backup: admin.BackupFile) -> tuple[dt.date, float, str]:
    created_timestamp = (
        backup.created_utc.timestamp() if backup.created_utc is not None else 0
    )
    return (
        _backup_filename_date(backup.name) or dt.date.min,
        created_timestamp,
        backup.name,
    )


def _generate_password_candidate() -> str:
    random = secrets.SystemRandom()
    required_characters = [
        secrets.choice(string.ascii_lowercase),
        secrets.choice(string.ascii_uppercase),
        secrets.choice(string.digits),
        secrets.choice(PASSWORD_SYMBOLS),
    ]
    alphabet = string.ascii_letters + string.digits + PASSWORD_SYMBOLS
    remaining_characters = [
        secrets.choice(alphabet)
        for _ in range(PASSWORD_GENERATION_LENGTH - len(required_characters))
    ]
    characters = required_characters + remaining_characters
    random.shuffle(characters)
    return "".join(characters)


def _validate_new_password(password: str, user: Users) -> None:
    evaluation = evaluate_password(
        password,
        user=user,
        include_compromised_check=True,
    )
    if not evaluation.is_policy_compliant:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Password does not meet password requirements.",
                "missing_requirements": evaluation.missing_requirements,
            },
        )

    if evaluation.compromised_count is not None and evaluation.compromised_count > 0:
        raise HTTPException(
            status_code=400,
            detail="Password appears in known compromised password lists.",
        )

    user.hashed_password = get_password_hash(password)
    user.password_changed_at = datetime.now(timezone.utc)
    apply_password_evaluation(user, evaluation)


def _serialize_service_account(
    service_account: Users,
    api_key: str | None = None,
) -> security.ServiceAccount | security.ServiceAccountWithKey:
    payload = {
        "id": service_account.id,
        "username": service_account.username,
        "email": service_account.email,
        "full_name": service_account.full_name,
        "disabled": service_account.disabled,
        "user_role_id": service_account.user_role_id,
        "user_role": service_account.user_role,
        "display_name": service_account.display_name,
        "redirect_page": service_account.redirect_page,
        "avatar_img": service_account.avatar_img,
        "password_changed_at": service_account.password_changed_at,
        "password_strength_score": service_account.password_strength_score,
        "password_strength_label": service_account.password_strength_label,
        "password_policy_compliant": service_account.password_policy_compliant,
        "password_compromised_checked_at": service_account.password_compromised_checked_at,
        "password_compromised_count": service_account.password_compromised_count,
        "is_service_account": service_account.is_service_account,
        "api_keys": service_account.service_account_api_keys,
    }
    if api_key is not None:
        payload["api_key"] = api_key
        return security.ServiceAccountWithKey(**payload)
    return security.ServiceAccount(**payload)


def _service_account_query():
    return select(Users).options(
        undefer(Users.username),
        undefer(Users.email),
        undefer(Users.user_role_id),
        joinedload(Users.user_role).joinedload(UserRoles.security_scopes),
        joinedload(Users.service_account_api_keys),
    )


@admin_router.post(
    "/users/{id}/generate_password",
    response_model=security.GeneratedPasswordResponse,
    dependencies=[Depends(ScopedUser.Admin)],
    tags=["Admin"],
)
def generate_user_password(id: int, db: Session = Depends(get_db)):
    user = db.scalars(select(Users).where(Users.id == id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_service_account:
        raise HTTPException(
            status_code=400,
            detail="Service accounts do not use passwords.",
        )

    for _ in range(PASSWORD_GENERATION_ATTEMPTS):
        password = _generate_password_candidate()
        evaluation = evaluate_password(
            password,
            user=user,
            include_compromised_check=True,
        )
        if evaluation.is_policy_compliant and evaluation.compromised_count == 0:
            return security.GeneratedPasswordResponse(password=password)

    raise HTTPException(
        status_code=503,
        detail="Unable to generate a verified uncompromised password. Please try again.",
    )


# define response models
@admin_router.post(
    "/users/update_password",
    response_model=security.User,
    dependencies=[Depends(ScopedUser.Admin)],
    tags=["Admin"],
)
def update_user_password(
    updatedUserPassword: security.UpdatedUserPassword,
    db: Session = Depends(get_db),
):
    user = db.scalars(
        select(Users).where(Users.id == updatedUserPassword.user_id)
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_service_account:
        raise HTTPException(
            status_code=400,
            detail="Service accounts do not use passwords.",
        )

    _validate_new_password(updatedUserPassword.new_password, user)
    db.commit()
    db.refresh(user)

    return user


@admin_router.patch(
    "/users",
    response_model=security.User,
    dependencies=[Depends(ScopedUser.Admin)],
    tags=["Admin"],
)
def update_user(
    updated_user: security.UpdatedUser, db: Session = Depends(get_db)
):
    user = db.scalars(select(Users).where(Users.id == updated_user.id)).first()
    if user and user.is_service_account:
        raise HTTPException(
            status_code=400,
            detail="Use service account endpoints to update service accounts.",
        )

    _patch(db, Users, updated_user.id, updated_user)

    qualified_user = db.scalars(
        select(Users)
        .options(
            undefer(Users.username),
            undefer(Users.user_role_id),
            undefer(Users.email),
            joinedload(Users.user_role),
        )
        .where(Users.id == updated_user.id)
    ).first()

    return qualified_user


@admin_router.post(
    "/users",
    response_model=security.User,
    dependencies=[Depends(ScopedUser.Admin)],
    tags=["Admin"],
)
def create_user(user: security.NewUser, db: Session = Depends(get_db)):
    new_user = Users(
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        display_name=user.display_name,
        user_role_id=user.user_role_id,
        disabled=user.disabled,
        hashed_password="",
    )
    _validate_new_password(user.password, new_user)

    db.add(new_user)
    db.commit()

    qualified_user = db.scalars(
        select(Users)
        .options(
            undefer(Users.username),
            undefer(Users.user_role_id),
            undefer(Users.email),
            joinedload(Users.user_role),
        )
        .where(Users.id == new_user.id)
    ).first()

    return qualified_user


@admin_router.get(
    "/users/{id}",
    response_model=security.User,
    dependencies=[Depends(ScopedUser.Admin)],
    tags=["Admin"],
)
def get_user_admin(id: int, db: Session = Depends(get_db)):
    """
    Admin-specific single user endpoint (includes username/email/role)
    """
    user = db.scalars(
        select(Users)
        .options(
            undefer(Users.username),
            undefer(Users.user_role_id),
            undefer(Users.email),
            joinedload(Users.user_role),
        )
        .where(Users.id == id)
        .where(Users.is_service_account.is_(False))
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user


@admin_router.get(
    "/usersadmin",
    response_model=List[security.User],
    dependencies=[Depends(ScopedUser.Admin)],
    tags=["Admin"],
)
def get_users_admin(db: Session = Depends(get_db)):
    """
    Admin-specific users list that includes sensitive information such as username and role
    """
    return (
        db.scalars(
            select(Users).options(
                undefer(Users.username),
                undefer(Users.user_role_id),
                undefer(Users.email),
                joinedload(Users.user_role),
            ).where(Users.is_service_account.is_(False))
        )
        .unique()
        .all()
    )


@admin_router.get(
    "/service-accounts",
    response_model=List[security.ServiceAccount],
    dependencies=[Depends(ScopedUser.Admin)],
    tags=["Admin"],
)
def get_service_accounts(db: Session = Depends(get_db)):
    service_accounts = (
        db.scalars(
            _service_account_query()
            .where(Users.is_service_account.is_(True))
            .order_by(Users.username)
        )
        .unique()
        .all()
    )
    return [
        _serialize_service_account(service_account)
        for service_account in service_accounts
    ]


@admin_router.post(
    "/service-accounts",
    response_model=security.ServiceAccountWithKey,
    dependencies=[Depends(ScopedUser.Admin)],
    tags=["Admin"],
)
def create_service_account(
    service_account: security.NewServiceAccount,
    db: Session = Depends(get_db),
):
    existing_user = db.scalars(
        select(Users).where(Users.username == service_account.username)
    ).first()
    if existing_user:
        raise HTTPException(status_code=409, detail="Username already exists")

    role = db.scalars(
        select(UserRoles).where(UserRoles.id == service_account.user_role_id)
    ).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    new_service_account = Users(
        username=service_account.username,
        email=None,
        full_name=service_account.full_name,
        display_name=service_account.display_name,
        user_role_id=service_account.user_role_id,
        disabled=service_account.disabled,
        is_service_account=True,
        hashed_password=get_password_hash(secrets.token_urlsafe(32)),
    )
    db.add(new_service_account)
    db.flush()
    _, api_key = create_service_account_api_key(db, new_service_account)
    db.commit()

    qualified_service_account = (
        db.scalars(_service_account_query().where(Users.id == new_service_account.id))
        .unique()
        .first()
    )
    return _serialize_service_account(qualified_service_account, api_key=api_key)


@admin_router.patch(
    "/service-accounts/{id}",
    response_model=security.ServiceAccount,
    dependencies=[Depends(ScopedUser.Admin)],
    tags=["Admin"],
)
def update_service_account(
    id: int,
    updated_service_account: security.UpdatedServiceAccount,
    db: Session = Depends(get_db),
):
    service_account = db.scalars(
        select(Users).where(
            Users.id == id,
            Users.is_service_account.is_(True),
        )
    ).first()
    if not service_account:
        raise HTTPException(status_code=404, detail="Service account not found")

    if updated_service_account.user_role_id is not None:
        role = db.scalars(
            select(UserRoles).where(UserRoles.id == updated_service_account.user_role_id)
        ).first()
        if not role:
            raise HTTPException(status_code=404, detail="Role not found")
        service_account.user_role_id = updated_service_account.user_role_id
    if updated_service_account.full_name is not None:
        service_account.full_name = updated_service_account.full_name
    if updated_service_account.display_name is not None:
        service_account.display_name = updated_service_account.display_name
    if updated_service_account.disabled is not None:
        service_account.disabled = updated_service_account.disabled

    db.commit()
    qualified_service_account = (
        db.scalars(_service_account_query().where(Users.id == service_account.id))
        .unique()
        .first()
    )
    return _serialize_service_account(qualified_service_account)


@admin_router.post(
    "/service-accounts/{id}/keys",
    response_model=security.ServiceAccountWithKey,
    dependencies=[Depends(ScopedUser.Admin)],
    tags=["Admin"],
)
def create_service_account_key(id: int, db: Session = Depends(get_db)):
    service_account = db.scalars(
        select(Users).where(
            Users.id == id,
            Users.is_service_account.is_(True),
        )
    ).first()
    if not service_account:
        raise HTTPException(status_code=404, detail="Service account not found")

    _, api_key = create_service_account_api_key(db, service_account)
    db.commit()
    qualified_service_account = (
        db.scalars(_service_account_query().where(Users.id == service_account.id))
        .unique()
        .first()
    )
    return _serialize_service_account(qualified_service_account, api_key=api_key)


@admin_router.delete(
    "/service-accounts/{id}/keys/{key_identifier}",
    dependencies=[Depends(ScopedUser.Admin)],
    tags=["Admin"],
)
def revoke_service_account_key(
    id: int,
    key_identifier: str,
    db: Session = Depends(get_db),
):
    api_key = (
        db.scalars(
            select(ServiceAccountApiKeys)
            .join(ServiceAccountApiKeys.user)
            .where(
                ServiceAccountApiKeys.key_identifier == key_identifier,
                ServiceAccountApiKeys.user_id == id,
                Users.is_service_account.is_(True),
            )
        )
        .unique()
        .first()
    )
    if not api_key:
        raise HTTPException(status_code=404, detail="Service account key not found")

    api_key.revoked_at = datetime.now(timezone.utc)
    db.add(api_key)
    db.commit()
    return {"status": "revoked"}


@admin_router.post(
    "/users/{id}/impersonate",
    response_model=security.Token,
    dependencies=[Depends(ScopedUser.Admin)],
    tags=["Admin"],
)
def impersonate_user(
    id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: Users = Depends(ScopedUser.Admin),
):
    if not settings.ALLOW_IMPERSONATION:
        raise HTTPException(
            status_code=403,
            detail="User impersonation is only available in development and pre-production environments.",
        )

    target_user = db.scalars(
        select(Users)
        .options(
            undefer(Users.username),
            undefer(Users.user_role_id),
            undefer(Users.email),
            joinedload(Users.user_role).joinedload(UserRoles.security_scopes),
        )
        .where(Users.id == id)
        .where(Users.is_service_account.is_(False))
    ).first()

    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    if target_user.disabled:
        raise HTTPException(status_code=400, detail="Cannot impersonate a disabled user")
    if target_user.is_service_account:
        raise HTTPException(status_code=400, detail="Cannot impersonate a service account")

    user_session = create_user_session(db=db, user=target_user, request=request)

    access_token = create_access_token(
        data={
            "sub": target_user.username,
            "sid": user_session.session_identifier,
            "scopes": list(
                map(
                    lambda scope: scope.scope_string,
                    target_user.user_role.security_scopes,
                )
            ),
        },
        expires_delta=timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS),
    )
    user_response = security.User(**target_user.__dict__)
    db.commit()

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_response,
        "session_identifier": user_session.session_identifier,
        "impersonation": security.ImpersonationContext(
            impersonator_user_id=current_admin.id,
            impersonator_full_name=current_admin.full_name,
            impersonator_display_name=current_admin.display_name,
        ),
    }


@admin_router.get(
    "/security_scopes",
    response_model=List[security.SecurityScope],
    dependencies=[Depends(ScopedUser.Admin)],
    tags=["Admin"],
)
def get_security_scopes(db: Session = Depends(get_db)):
    return db.scalars(select(SecurityScopes)).all()


@admin_router.get(
    "/roles",
    response_model=List[security.UserRole],
    dependencies=[Depends(ScopedUser.Admin)],
    tags=["Admin"],
)
def get_roles(db: Session = Depends(get_db)):
    return (
        db.scalars(select(UserRoles).options(joinedload(UserRoles.security_scopes)))
        .unique()
        .all()
    )


@admin_router.post(
    "/roles",
    response_model=security.UserRole,
    dependencies=[Depends(ScopedUser.Admin)],
    tags=["Admin"],
)
def create_role(new_role: security.UserRole, db: Session = Depends(get_db)):
    scopes = []
    if new_role.security_scopes:
        scope_ids = map(lambda s: s.id, new_role.security_scopes)
        scopes = db.scalars(
            select(SecurityScopes).where(SecurityScopes.id.in_(scope_ids))
        ).all()

    new_role_model = UserRoles(name=new_role.name, security_scopes=scopes)

    db.add(new_role_model)
    db.commit()
    db.refresh(new_role_model)

    return db.scalars(
        select(UserRoles)
        .where(UserRoles.id == new_role_model.id)
        .options(joinedload(UserRoles.security_scopes))
    ).first()


@admin_router.patch(
    "/roles",
    response_model=security.UserRole,
    dependencies=[Depends(ScopedUser.Admin)],
    tags=["Admin"],
)
def update_role(updated_role: security.UserRole, db: Session = Depends(get_db)):
    role = db.scalars(select(UserRoles).where(UserRoles.id == updated_role.id)).first()

    scope_ids = map(lambda s: s.id, updated_role.security_scopes)

    scopes = db.scalars(
        select(SecurityScopes).where(SecurityScopes.id.in_(scope_ids))
    ).all()

    role.name = updated_role.name
    role.security_scopes = scopes

    db.commit()

    return db.scalars(
        select(UserRoles)
        .where(UserRoles.id == updated_role.id)
        .options(joinedload(UserRoles.security_scopes))
    ).first()


@admin_router.get(
    "/db-backups",
    response_model=List[admin.BackupFile],
    dependencies=[Depends(ScopedUser.Admin)],
    tags=["Admin"],
)
def list_db_backups(
    signed_expires_minutes: int = 60,
    limit: int = 200,
):
    if not BUCKET_NAME:
        raise HTTPException(status_code=500, detail="GCP_BUCKET_NAME is not set")

    if signed_expires_minutes < 1 or signed_expires_minutes > 24 * 60:
        raise HTTPException(
            status_code=400, detail="signed_expires_minutes must be between 1 and 1440"
        )

    client = storage.Client()

    prefix = (BACKUP_PREFIX or "").strip("/")
    if prefix:
        prefix = prefix + "/"

    blobs_iter = client.list_blobs(BUCKET_NAME, prefix=prefix)

    results: list[admin.BackupFile] = []
    for blob in blobs_iter:
        # Skip folder marker objects if any
        if blob.name.endswith("/") and (blob.size or 0) == 0:
            continue

        # Strip folder prefix for display
        display_name = blob.name
        if prefix and display_name.startswith(prefix):
            display_name = display_name[len(prefix) :]

        # infer format from extension + known pg_dump flags
        ext = blob.name.rsplit(".", 1)[-1].lower() if "." in blob.name else ""
        if ext == "dump":
            fmt = "pg_dump custom (-Fc) (.dump)"
        elif ext in ("sql",):
            fmt = "plain SQL"
        elif ext in ("gz", "gzip"):
            fmt = "compressed"
        else:
            fmt = f"unknown ({ext})" if ext else "unknown"

        results.append(
            admin.BackupFile(
                name=display_name,
                file_size=int(blob.size or 0),
                format=fmt,
                gs_uri=f"gs://{BUCKET_NAME}/{blob.name}",
                created_utc=blob.time_created,
            )
        )

    results.sort(key=_backup_sort_key, reverse=True)
    return results[:limit]


@admin_router.get(
    "/db-backups/{file_name}/download",
    dependencies=[Depends(ScopedUser.Admin)],
    tags=["Admin"],
)
async def download_db_backup(file_name: str):
    if not BUCKET_NAME:
        raise HTTPException(status_code=500, detail="GCP_BUCKET_NAME is not set")

    client = storage.Client()
    bucket = client.bucket(BUCKET_NAME)

    prefix = (BACKUP_PREFIX or "").strip("/")
    blob_name = f"{prefix}/{file_name}" if prefix else file_name

    blob = bucket.blob(blob_name)

    if not blob.exists(client=client):
        raise HTTPException(status_code=404, detail="Backup file not found in storage")

    blob.reload(client=client)
    content_type = blob.content_type or "application/octet-stream"

    # Stream from GCS to the client
    file_obj = blob.open("rb")

    # Force download
    headers = {"Content-Disposition": f'attachment; filename="{file_name}"'}

    return StreamingResponse(file_obj, media_type=content_type, headers=headers)


@admin_router.api_route(
    "/backup-db/",
    methods=["BACKUP"],
    tags=["Admin"],
    dependencies=[Depends(ScopedUser.Admin)],
)
def backup_and_send():
    if not BUCKET_NAME:
        raise ValueError("GCP_BUCKET_NAME environment variable is not set")
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL environment variable is not set")

    # Use UTC-aware timestamp
    timestamp = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d-%H%M%S")
    filename = f"backup-{timestamp}.dump"
    local_path = Path(f"/tmp/{filename}")

    subprocess.run(["pg_dump", "-Fc", DATABASE_URL, "-f", str(local_path)], check=True)

    client = storage.Client()
    bucket = client.bucket(BUCKET_NAME)

    blob_name = f"{BACKUP_PREFIX}/{filename}" if BACKUP_PREFIX else filename
    blob = bucket.blob(blob_name)
    blob.upload_from_filename(local_path)

    print(f"Backup uploaded to gs://{BUCKET_NAME}/{blob_name}")

    local_path.unlink(missing_ok=True)

    # Delete old backups (> BACKUP_RETENTION_DAYS) using UTC-aware cutoff
    cutoff_date = dt.datetime.now(dt.timezone.utc) - dt.timedelta(
        days=BACKUP_RETENTION_DAYS
    )
    blobs = client.list_blobs(BUCKET_NAME, prefix=BACKUP_PREFIX)

    deleted = []
    for old_blob in blobs:
        if old_blob.time_created < cutoff_date:
            old_blob.delete()
            deleted.append(old_blob.name)

    return {
        "status": f"Database backup uploaded to gs://{BUCKET_NAME}/{blob_name}",
        "deleted_old_backups": deleted,
    }
