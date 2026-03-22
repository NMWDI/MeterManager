from base64 import b64encode
from io import BytesIO

from fastapi import Depends, APIRouter, HTTPException, File, UploadFile
from PIL import Image, UnidentifiedImageError
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from api.schemas import settings
from api.session import get_db
from api.security import get_current_user, get_password_hash, verify_password
from api.models.user import Users


settings_router = APIRouter()
MAX_AVATAR_FILE_SIZE_BYTES = 5 * 1024 * 1024
MAX_AVATAR_PIXELS = 4096 * 4096
ALLOWED_AVATAR_FORMATS = {
    "JPEG": "image/jpeg",
    "PNG": "image/png",
    "WEBP": "image/webp",
    "GIF": "image/gif",
}


@settings_router.get(
    "/settings/redirect_page",
    tags=["settings"],
)
def get_redirect_page(
    db: Session = Depends(get_db),
    user: Users = Depends(get_current_user),
):
    db_user = db.query(Users).filter(Users.id == user.id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    return {"redirect_page": db_user.redirect_page}

@settings_router.post(
    "/settings/redirect_page",
    tags=["settings"],
)
def post_redirect_page(
    update: settings.RedirectPageUpdate,
    db: Session = Depends(get_db),
    user: Users = Depends(get_current_user),
):
    db_user = db.query(Users).filter(Users.id == user.id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    db_user.redirect_page = update.redirect_page
    db.commit()
    db.refresh(db_user)

    return {"message": "Redirect page updated", "redirect_page": db_user.redirect_page}

@settings_router.post(
    "/settings/display_name",
    tags=["settings"],
)
def post_redirect_page(
    update: settings.DisplayNameUpdate,
    db: Session = Depends(get_db),
    user: Users = Depends(get_current_user),
):
    db_user = db.query(Users).filter(Users.id == user.id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    db_user.display_name = update.display_name
    db.commit()
    db.refresh(db_user)

    return {"message": "Display name updated", "display_name": db_user.display_name}


@settings_router.post(
    "/settings/password_reset",
    tags=["settings"],
)
def post_password_reset(
    update: settings.PasswordResetRequest,
    db: Session = Depends(get_db),
    user: Users = Depends(get_current_user),
):
    db_user = db.query(Users).filter(Users.id == user.id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    if not verify_password(update.current_password, db_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    if update.current_password == update.new_password:
        raise HTTPException(
            status_code=400,
            detail="New password must be different from current password",
        )

    if len(update.new_password) < 8:
        raise HTTPException(
            status_code=400,
            detail="New password must be at least 8 characters long",
        )

    db_user.hashed_password = get_password_hash(update.new_password)

    try:
        db.commit()
        db.refresh(db_user)
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to update password")

    return {"message": "Password updated"}


@settings_router.post(
    "/settings/avatar",
    tags=["settings"],
)
async def post_avatar(
    avatar: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: Users = Depends(get_current_user),
):
    db_user = db.query(Users).filter(Users.id == user.id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    avatar_bytes = await avatar.read()

    if not avatar_bytes:
        raise HTTPException(status_code=400, detail="Avatar image is required")

    if len(avatar_bytes) > MAX_AVATAR_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Avatar image exceeds {MAX_AVATAR_FILE_SIZE_BYTES // (1024 * 1024)} MB limit",
        )

    try:
        with Image.open(BytesIO(avatar_bytes)) as image:
            width, height = image.size
            if width * height > MAX_AVATAR_PIXELS:
                raise HTTPException(status_code=400, detail="Avatar image is too large")

            image.verify()

        with Image.open(BytesIO(avatar_bytes)) as image:
            image_format = image.format

    except HTTPException:
        raise
    except (UnidentifiedImageError, Image.DecompressionBombError, OSError):
        raise HTTPException(status_code=400, detail="Uploaded file is not a valid image")

    if image_format not in ALLOWED_AVATAR_FORMATS:
        raise HTTPException(
            status_code=400,
            detail="Avatar image must be a JPEG, PNG, WEBP, or GIF file",
        )

    db_user.avatar_img = (
        f"data:{ALLOWED_AVATAR_FORMATS[image_format]};base64,"
        f"{b64encode(avatar_bytes).decode('ascii')}"
    )

    try:
        db.commit()
        db.refresh(db_user)
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to update avatar image")

    return {"message": "Avatar updated", "avatar_img": db_user.avatar_img}


@settings_router.delete(
    "/settings/avatar",
    tags=["settings"],
)
def delete_avatar(
    db: Session = Depends(get_db),
    user: Users = Depends(get_current_user),
):
    db_user = db.query(Users).filter(Users.id == user.id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    db_user.avatar_img = None

    try:
        db.commit()
        db.refresh(db_user)
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to clear avatar image")

    return {"message": "Avatar cleared", "avatar_img": db_user.avatar_img}
