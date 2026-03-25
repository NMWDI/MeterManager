from typing import Optional
import datetime

from api.schemas.base import ORMBase
from pydantic import BaseModel


class BackupFile(ORMBase):
    name: str
    file_size: int
    format: str
    gs_uri: str
    created_utc: Optional[datetime.datetime] = None
