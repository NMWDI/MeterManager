from fastapi import Depends, APIRouter, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
from datetime import datetime, date
from fastapi.responses import StreamingResponse
from weasyprint import HTML
from io import BytesIO
from collections import defaultdict
from matplotlib.pyplot import figure, close
from api.models.main_models import (
    Users,
    Meters,
    MeterActivities,
    ActivityTypeLU,
    Locations,
)
from api.session import get_db
from api.enums import ScopedUser
from pathlib import Path
from jinja2 import Environment, FileSystemLoader, select_autoescape

import matplotlib

matplotlib.use("Agg")  # Force non-GUI backend


TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"

templates = Environment(
    loader=FileSystemLoader(TEMPLATES_DIR),
    autoescape=select_autoescape(["html", "xml"]),
)

maintenance_router = APIRouter()


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


@maintenance_router.get(
    "/maintenance",
    tags=["Maintenance"],
    response_model=MaintenanceSummaryResponse,
    dependencies=[Depends(ScopedUser.Read)],
)
def get_maintenance_summary(
    from_date: date = Query(..., description="Start date YYYY-MM-DD"),
    to_date: date = Query(..., description="End date YYYY-MM-DD"),
    trss: str = Query(...),
    technicians: List[int] = Query(...),
    db: Session = Depends(get_db),
):
    """
    Returns min/max/avg for north/south/east/west halves **within the SE quadrant of New Mexico**,
    over the specified [from_date, to_date] inclusive range.
    """
    # Convert to datetimes for inclusive range
    start_dt = datetime.combine(from_date, datetime.min.time())
    end_dt = datetime.combine(to_date, datetime.max.time())

    filter_techs = -1 not in technicians

    # Optional TRSS-based meter filtering
    matching_meter_ids = None
    if trss:
        try:
            # normalize input (strip spaces)
            trss_str = trss.strip()
            location_ids = [
                loc_id
                for (loc_id,) in db.query(Locations.id)
                .filter(Locations.trss.like(f"{trss_str}%"))
                .all()
            ]
            if location_ids:
                meter_subq = db.query(Meters.id).filter(
                    Meters.location_id.in_(location_ids)
                )
                matching_meter_ids = [m_id for (m_id,) in meter_subq.all()]
        except Exception:
            pass  # Ignore invalid TRSS input silently

    query = (
        db.query(
            MeterActivities.timestamp_start.label("date_time"),
            Users.full_name.label("technician"),
            Meters.serial_number.label("meter"),
            ActivityTypeLU.name.label("activity_type"),
            Locations.trss.label("trss"),
        )
        .join(Users, Users.id == MeterActivities.submitting_user_id)
        .join(Meters, Meters.id == MeterActivities.meter_id)
        .join(ActivityTypeLU, ActivityTypeLU.id == MeterActivities.activity_type_id)
        .join(Locations, Locations.id == Meters.location_id, isouter=True)
        .filter(MeterActivities.timestamp_start >= start_dt)
        .filter(MeterActivities.timestamp_start <= end_dt)
    )

    if filter_techs:
        query = query.filter(MeterActivities.submitting_user_id.in_(technicians))

    if matching_meter_ids is not None:
        if not matching_meter_ids:
            return {
                "repairs_by_meter": [],
                "pms_by_meter": [],
                "table_rows": [],
            }
        query = query.filter(MeterActivities.meter_id.in_(matching_meter_ids))

    base_query = query.order_by(MeterActivities.timestamp_start).all()

    repairs_by_meter = defaultdict(int)
    pms_by_meter = defaultdict(int)
    grouped_rows = defaultdict(lambda: {"number_of_repairs": 0, "number_of_pms": 0})

    total_repairs = 0
    total_pms = 0

    for row in base_query:
        key = (row.date_time, row.technician, row.meter, row.trss)
        if row.activity_type == "Repair":
            repairs_by_meter[row.meter] += 1
            grouped_rows[key]["number_of_repairs"] += 1
            total_repairs += 1
        elif row.activity_type == "Preventative Maintenance":
            pms_by_meter[row.meter] += 1
            grouped_rows[key]["number_of_pms"] += 1
            total_pms += 1

    repairs_result = [{"meter": m, "count": c} for m, c in repairs_by_meter.items()]
    pms_result = [{"meter": m, "count": c} for m, c in pms_by_meter.items()]

    table_rows = []
    for (date_time, technician, meter, trss_val), counts in grouped_rows.items():
        table_rows.append(
            {
                "date_time": date_time,
                "technician": technician,
                "meter": meter,
                "trss": trss_val or "",
                "number_of_repairs": counts["number_of_repairs"],
                "number_of_pms": counts["number_of_pms"],
            }
        )

    return {
        "repairs_by_meter": repairs_result,
        "pms_by_meter": pms_result,
        "table_rows": table_rows,
        "total_repairs": total_repairs,
        "total_pms": total_pms,
    }


@maintenance_router.get(
    "/maintenance/pdf",
    tags=["Maintenance"],
    dependencies=[Depends(ScopedUser.Read)],
)
def download_maintenance_summary_pdf(
    from_date: date = Query(..., description="Start date YYYY-MM-DD"),
    to_date: date = Query(..., description="End date YYYY-MM-DD"),
    trss: str = Query(...),
    technicians: List[int] = Query(...),
    db: Session = Depends(get_db),
):
    """
    Generate a PDF maintenance summary between two dates.
    Reuses the JSON endpoint's logic to avoid duplication.
    """
    # Re-use the endpoint logic directly
    summary = get_maintenance_summary(
        from_date=from_date,
        to_date=to_date,
        trss=trss,
        technicians=technicians,
        db=db,
    )

    total_repairs = summary["total_repairs"]
    total_pms = summary["total_pms"]

    template = templates.get_template("maintenance_summary.html")
    html = template.render(
        from_date=from_date,
        to_date=to_date,
        total_repairs=total_repairs,
        total_pms=total_pms,
        table_rows=summary["table_rows"],
    )

    pdf_io = BytesIO()
    HTML(string=html).write_pdf(pdf_io)
    pdf_io.seek(0)

    return StreamingResponse(
        pdf_io,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=maintenance_summary.pdf"},
    )
