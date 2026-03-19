from datetime import timedelta
from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordRequestForm
from fastapi_pagination import add_pagination
from fastapi.middleware.cors import CORSMiddleware
from starlette import status
from api.schemas import security_schemas
from api.models.main_models import Users
from api.routes.activities import activity_router, public_activity_router
from api.routes.admin import admin_router
from api.routes.chlorides import authenticated_chlorides_router, public_chlorides_router
from api.routes.maintenance import (
    authenticated_maintenance_router,
    public_maintenance_router,
)
from api.routes.meters import authenticated_meter_router, public_meter_router
from api.routes.notifications import notifications_router
from api.routes.OSE import ose_router
from api.routes.parts import part_router
from api.routes.settings import settings_router
from api.routes.user_sessions import user_sessions_router
from api.routes.well_measurements import (
    authenticated_well_measurement_router,
    public_well_measurement_router,
)
from api.routes.wells import authenticated_well_router, public_well_router
from api.security import (
    authenticate_user,
    create_access_token,
    ACCESS_TOKEN_EXPIRE_HOURS,
    authenticated_router,
    get_session_identifier_from_token,
)
from api.session import get_db, SessionLocal
from api.session_tracking import create_user_session, touch_user_session
from sqlalchemy.orm import Session

tags_metadata = [
    {"name": "Wells", "description": "Well Related Endpoints"},
    {"name": "Parts", "description": "Part Related Endpoints"},
    {"name": "Meters", "description": "Meter Related Endpoints"},
    {
        "name": "Activities",
        "description": "Activity Submission and Viewing Related Endpoints",
    },
    {
        "name": "WaterLevels",
        "description": "Groundwater Depth and Chloride Measurement Related Endpoints",
    },
    {"name": "Notifications", "description": "Notification related endpoints"},
    {"name": "OSE", "description": "Endpoints Used by the OSE to Generate Reports"},
    {"name": "Admin", "description": "Admin Functionality Related Endpoints"},
    {"name": "Login", "description": "User Auth and Token Related Endpoints"},
]

description = """
The PVACD Meter API gives programatic access to the PVACDs meter database

"""
title = "PVACD Meter API"

app = FastAPI(
    title=title,
    description=description,
    openapi_tags=tags_metadata,
    version="0.2.0",
)

origins = [
    "http://localhost",
    "http://localhost:5173",
    "http://localhost:8000",
    "https://pvacd.newmexicowaterdata.org",
    "https://pvacd-dev.newmexicowaterdata.org",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============== Security ==============


@app.post("/token", response_model=security_schemas.Token, tags=["Login"])
def login_for_access_token(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user: Users = authenticate_user(form_data.username, form_data.password, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user.disabled:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="This account is disabled",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_session = create_user_session(db=db, user=user, request=request)

    access_token = create_access_token(
        data={
            "sub": user.username,
            "sid": user_session.session_identifier,
            "scopes": list(
                map(lambda scope: scope.scope_string, user.user_role.security_scopes)
            ),
        },
        expires_delta=timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS),
    )
    user_response = security_schemas.User(**user.__dict__)
    db.commit()

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_response,
        "session_identifier": user_session.session_identifier,
    }


@app.middleware("http")
async def update_user_session_last_seen(request: Request, call_next):
    authorization_header = request.headers.get("authorization")
    if authorization_header and authorization_header.startswith("Bearer "):
        token = authorization_header.removeprefix("Bearer ").strip()
        session_identifier = None

        try:
            session_identifier = get_session_identifier_from_token(token)
        except Exception:
            session_identifier = None

        if session_identifier:
            db = SessionLocal()
            try:
                touch_user_session(db, session_identifier)
            finally:
                db.close()

    return await call_next(request)


# =======================================

authenticated_router.include_router(activity_router)
authenticated_router.include_router(admin_router)
authenticated_router.include_router(authenticated_chlorides_router)
authenticated_router.include_router(authenticated_maintenance_router)
authenticated_router.include_router(authenticated_meter_router)
authenticated_router.include_router(notifications_router)
authenticated_router.include_router(part_router)
authenticated_router.include_router(authenticated_well_measurement_router)
authenticated_router.include_router(authenticated_well_router)
authenticated_router.include_router(settings_router)

add_pagination(app)

app.include_router(ose_router)
app.include_router(public_activity_router)
app.include_router(public_meter_router)
app.include_router(public_well_router)
app.include_router(public_chlorides_router)
app.include_router(public_maintenance_router)
app.include_router(public_well_measurement_router)
app.include_router(user_sessions_router)
app.include_router(authenticated_router)
