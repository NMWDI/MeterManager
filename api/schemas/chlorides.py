from typing import Optional

from pydantic import BaseModel


class MinMaxAvgMedCount(BaseModel):
    min: Optional[float] = None
    max: Optional[float] = None
    avg: Optional[float] = None
    median: Optional[float] = None
    count: int = 0


class ChlorideReportNums(BaseModel):
    north_west: MinMaxAvgMedCount
    north_east: MinMaxAvgMedCount
    south_west: MinMaxAvgMedCount
    south_east: MinMaxAvgMedCount
