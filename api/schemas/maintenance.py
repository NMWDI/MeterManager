from datetime import datetime
from typing import List

from pydantic import BaseModel


class MeterSummary(BaseModel):
    meter: str
    count: int


class MaintenanceRow(BaseModel):
    date_time: datetime
    technician: str
    meter: str
    trss: str
    number_of_repairs: int
    number_of_pms: int


class MaintenanceSummaryResponse(BaseModel):
    repairs_by_meter: List[MeterSummary]
    pms_by_meter: List[MeterSummary]
    table_rows: List[MaintenanceRow]


class HomeSummaryResponse(BaseModel):
    completed_work_orders: int
    repairs_processed: int
    reinstallations_processed: int
    preventative_maintenance_processed: int
