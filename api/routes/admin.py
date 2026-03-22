from fastapi import Depends, APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload, undefer
from sqlalchemy import select
from typing import List
from passlib.context import CryptContext

from api.models.user import Users, UserRoles, SecurityScopes

from api.schemas import security
from api.schemas import admin
from api.session import get_db
from api.routes.utils import _patch
from api.auth.dependencies import ScopedUser

from pathlib import Path
from google.cloud import storage
from dotenv import load_dotenv

import os
import subprocess
import datetime

admin_router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

BUCKET_NAME = os.getenv("GCP_BUCKET_NAME", "")
BACKUP_PREFIX = os.getenv("GCP_BACKUP_PREFIX", "")
BACKUP_RETENTION_DAYS = int(os.getenv("BACKUP_RETENTION_DAYS", "30"))
load_dotenv(os.getenv("APPDB_ENV", ".env"))
DATABASE_URL = os.getenv("DATABASE_URL", "")


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

    user.hashed_password = pwd_context.hash(updatedUserPassword.new_password)
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
        hashed_password=pwd_context.hash(user.password),
    )

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
            )
        )
        .unique()
        .all()
    )


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
    for i, blob in enumerate(blobs_iter):
        if i >= limit:
            break

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

    # newest first
    results.sort(key=lambda x: x.created_utc or 0, reverse=True)
    return results


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
    timestamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d-%H%M%S")
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
    cutoff_date = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(
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
