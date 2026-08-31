"""
Configures the database connection
Can be local or remote

Before using set an environmental variable APPDB_ENV to the name of the environment file to use.
.env_dev - remote development database
.env_local - local development database
.env_production - production database

"""

import os
from typing import Optional
from dotenv import load_dotenv

from pathlib import Path

env_path = Path("api") / os.getenv("APPDB_ENV")
load_dotenv(dotenv_path=env_path)


class Settings:
    POSTGRES_USER: Optional[str] = os.getenv("POSTGRES_USER")
    POSTGRES_PASSWORD: Optional[str] = os.getenv("POSTGRES_PASSWORD")
    POSTGRES_HOST: Optional[str] = os.getenv("POSTGRES_HOST")
    POSTGRES_PORT: str | int = os.getenv(
        "POSTGRES_PORT", 5432
    )  # default postgres port is 5432
    POSTGRES_DB: Optional[str] = os.getenv("POSTGRES_DB")
    JWT_SECRET_KEY: Optional[str] = os.getenv("JWT_SECRET_KEY")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_HOURS: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_HOURS", "8"))
    USER_SESSION_RETENTION_DAYS: int = int(
        os.getenv("USER_SESSION_RETENTION_DAYS", "14")
    )
    APP_ENV: str = os.getenv(
        "APP_ENV",
        "production" if os.getenv("APPDB_ENV") == ".env_production" else "development",
    )
    ALLOW_IMPERSONATION: bool = APP_ENV in {"development", "pre-production"}
    OSE_BULK_EXPORT_URL: Optional[str] = os.getenv("OSE_BULK_EXPORT_URL")
    OSE_BULK_EXPORT_LIMIT: int = int(os.getenv("OSE_BULK_EXPORT_LIMIT", "100"))
    DATABASE_URL = f"postgresql+psycopg://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"


settings = Settings()
