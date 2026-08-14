from datetime import timedelta, datetime
import hashlib
import hmac
import secrets
from typing import Union, Annotated

from fastapi import HTTPException, Depends, APIRouter, Security
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, ExpiredSignatureError
from passlib.context import CryptContext
from starlette import status
from sqlalchemy import or_
from sqlalchemy.orm import joinedload, undefer, Session
from sqlalchemy.sql import select

from api.models.user import (
    ServiceAccountApiKeys,
    Users,
    UserRoles,
    UserSessions,
)
from api.schemas import security as security_schema
from api.config import settings
from api.session import get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SECRET_KEY = settings.JWT_SECRET_KEY
ALGORITHM = settings.JWT_ALGORITHM
ACCESS_TOKEN_EXPIRE_HOURS = settings.ACCESS_TOKEN_EXPIRE_HOURS
SERVICE_ACCOUNT_KEY_PREFIX = "wmdb_sa"

if not SECRET_KEY:
    raise RuntimeError("JWT_SECRET_KEY environment variable must be set.")

invalid_credentials_exception = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials.",
    headers={"WWW-Authenticate": "Bearer"},
)

missing_permissions_exception = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Not enough permissions",
    headers={"WWW-Authenticate": "Bearer"},
)

expired_token_exception = HTTPException(
    status_code=440,
    detail="Token expired, please login again to receive a new one.",
    headers={"WWW-Authenticate": "Bearer"},
)

inactive_session_exception = HTTPException(
    status_code=440,
    detail="Session is no longer active. Please login again.",
    headers={"WWW-Authenticate": "Bearer"},
)


# Return the current user if credentials were correct, False if not
def authenticate_user(login_identifier: str, password: str, db: Session):
    user = get_user_by_login(login_identifier, db)
    if not user:
        return False
    if user.is_service_account:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user


# Helper function to create JWT token
def create_access_token(data: dict, expires_delta: Union[timedelta, None] = None):
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

    return encoded_jwt


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    return pwd_context.hash(password)


def get_user_query():
    return (
        select(Users)
        .options(
            undefer(Users.hashed_password),
            undefer(Users.username),
            undefer(Users.user_role_id),
            undefer(Users.email),
            joinedload(Users.user_role).joinedload(UserRoles.security_scopes),
        )
    )


def get_user_by_login(login_identifier: str, db: Session) -> Users:
    # Allow login via either username or email.
    user_stmt = get_user_query().filter(
        or_(Users.username == login_identifier, Users.email == login_identifier)
    )
    dbuser = db.scalars(user_stmt).first()

    if dbuser:
        return dbuser


def get_user(username: str, db: Session) -> Users:
    user_stmt = get_user_query().filter(Users.username == username)
    dbuser = db.scalars(user_stmt).first()

    if dbuser:
        return dbuser


def _hash_service_account_key(api_key: str) -> str:
    return hashlib.sha256(api_key.encode("utf-8")).hexdigest()


def create_service_account_api_key(db: Session, user: Users) -> tuple[ServiceAccountApiKeys, str]:
    key_identifier = secrets.token_urlsafe(12).replace("-", "").replace("_", "")[:16]
    secret = secrets.token_urlsafe(32)
    api_key = f"{SERVICE_ACCOUNT_KEY_PREFIX}_{key_identifier}_{secret}"
    key = ServiceAccountApiKeys(
        user_id=user.id,
        key_identifier=key_identifier,
        key_hash=_hash_service_account_key(api_key),
        key_prefix=api_key[:24],
    )
    db.add(key)
    return key, api_key


def get_user_by_service_account_key(api_key: str, db: Session) -> Users | None:
    parts = api_key.split("_", 3)
    if len(parts) != 4 or "_".join(parts[:2]) != SERVICE_ACCOUNT_KEY_PREFIX:
        return None

    key_identifier = parts[2]
    key = (
        db.scalars(
            select(ServiceAccountApiKeys)
            .options(
                joinedload(ServiceAccountApiKeys.user).options(
                    undefer(Users.username),
                    undefer(Users.user_role_id),
                    undefer(Users.email),
                    joinedload(Users.user_role).joinedload(UserRoles.security_scopes),
                ),
            )
            .where(
                ServiceAccountApiKeys.key_identifier == key_identifier,
                ServiceAccountApiKeys.revoked_at.is_(None),
            )
        )
        .unique()
        .first()
    )

    if key is None:
        return None

    if not hmac.compare_digest(key.key_hash, _hash_service_account_key(api_key)):
        return None

    user = key.user
    if user is None or not user.is_service_account or user.disabled:
        return None

    key.last_used_at = datetime.utcnow()
    db.add(key)
    db.commit()
    return user


def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[Session, Depends(get_db)],
    ) -> Users:
    service_account_user = get_user_by_service_account_key(token, db)
    if service_account_user:
        return service_account_user

    try:
        payload = decode_access_token(token)

        username: str = payload.get("sub")
        if username is None:
            raise invalid_credentials_exception

        user = get_user(username=username, db=db)

        if user is None:
            raise invalid_credentials_exception

        session_identifier: str | None = payload.get("sid")
        if session_identifier is None:
            if payload.get("session_tracking_disabled") is True:
                return user

            raise invalid_credentials_exception

        session = (
            db.query(UserSessions)
            .filter(
                UserSessions.session_identifier == session_identifier,
                UserSessions.user_id == user.id,
                UserSessions.is_active.is_(True),
                UserSessions.signed_out_at.is_(None),
            )
            .first()
        )
        if session is None:
            raise inactive_session_exception

        return user

    except ExpiredSignatureError:
        raise expired_token_exception

    except HTTPException:
        raise

    except Exception:
        raise invalid_credentials_exception


def decode_access_token(token: str, verify_exp: bool = True) -> dict:
    decode_options = None
    if not verify_exp:
        decode_options = {"verify_exp": False}

    return jwt.decode(
        token,
        SECRET_KEY,
        algorithms=[ALGORITHM],
        options=decode_options,
    )


def get_session_identifier_from_token(
    token: str, verify_exp: bool = True
) -> str | None:
    payload = decode_access_token(token, verify_exp=verify_exp)
    session_identifier: str | None = payload.get("sid")
    return session_identifier


# Provide a list of scope_strings, recieve the current user if those scopes are present, raise auth exception if not
def scoped_user(scopes):
    def get_user(current_user: Users = Security(get_current_user)):
        current_user_scope_strings = list(
            map(lambda x: x.scope_string, current_user.user_role.security_scopes)
        )

        for scope in scopes:
            if scope not in current_user_scope_strings:
                raise missing_permissions_exception

        return current_user

    return get_user


authenticated_router = APIRouter(dependencies=[Depends(scoped_user(["read"]))])


@authenticated_router.get(
    "/users/me", response_model=security_schema.User, tags=["Login"]
)
def read_users_me(
    current_user: security_schema.User = Depends(get_current_user),
):
    return current_user


# ============= EOF =============================================
