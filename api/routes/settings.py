from fastapi import Depends, APIRouter, HTTPException
from sqlalchemy.orm import Session
from api.schemas.base import ORMBase
from api.session import get_db
from api.security import get_current_user
from api.models.main_models import Users


settings_router = APIRouter()


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


class RedirectPageUpdate(ORMBase):
    redirect_page: str


@settings_router.post(
    "/settings/redirect_page",
    tags=["settings"],
)
def post_redirect_page(
    update: RedirectPageUpdate,
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


class DisplayNameUpdate(ORMBase):
    display_name: str


@settings_router.post(
    "/settings/display_name",
    tags=["settings"],
)
def post_redirect_page(
    update: DisplayNameUpdate,
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
