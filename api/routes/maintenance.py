from fastapi import Depends, APIRouter, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
from datetime import datetime
import calendar
from fastapi.responses import StreamingResponse
from weasyprint import HTML
from io import BytesIO
from collections import defaultdict
from matplotlib.pyplot import figure, close
from base64 import b64encode
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
    autoescape=select_autoescape(["html", "xml"])
)

maintenance_router = APIRouter()


class MeterSummary(BaseModel):
    meter: str
    count: int


class MaintenanceRow(BaseModel):
    date_time: datetime
    technician: str
    number_of_repairs: int
    number_of_pms: int
    meter: str


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
    from_month: str = Query(..., pattern=r"^\d{4}-\d{2}$"),
    to_month: str = Query(..., pattern=r"^\d{4}-\d{2}$"),
    trss: str = Query(...),
    technicians: List[int] = Query(...),
    db: Session = Depends(get_db),
):
    # Parse from/to month into datetime range
    try:
        from_date = datetime.strptime(from_month, "%Y-%m").replace(day=1)
        to_dt = datetime.strptime(to_month, "%Y-%m")
        year, month = to_dt.year, to_dt.month
        today = datetime.now()

        if year == today.year and month == today.month:
            to_date = today
        else:
            last_day = calendar.monthrange(year, month)[1]
            to_date = to_dt.replace(day=last_day, hour=23, minute=59, second=59)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid date format. Use YYYY-MM."
        )

    # Filter by technicians if -1 is not present
    filter_techs = -1 not in technicians

    # Optional TRSS-based meter filtering
    matching_meter_ids = None
    if trss:
        try:
            parts = list(map(int, trss.strip().split(".")))
            if len(parts) >= 4:
                township, range_, section, quarter = parts[:4]

                location_subq = (
                    db.query(Locations.id)
                    .filter(
                        Locations.township == township,
                        Locations.range == range_,
                        Locations.section == section,
                        Locations.quarter == quarter,
                    )
                )
                location_ids = [loc_id for (loc_id,) in location_subq.all()]

                if location_ids:
                    meter_subq = (
                        db.query(Meters.id)
                        .filter(Meters.location_id.in_(location_ids))
                    )
                    matching_meter_ids = [m_id for (m_id,) in meter_subq.all()]
        except Exception:
            pass  # Ignore invalid TRSS input silently

    # Base query
    query = (
        db.query(
            MeterActivities.timestamp_start.label("date_time"),
            Users.full_name.label("technician"),
            Meters.serial_number.label("meter"),
            ActivityTypeLU.name.label("activity_type")
        )
        .join(Users, Users.id == MeterActivities.submitting_user_id)
        .join(Meters, Meters.id == MeterActivities.meter_id)
        .join(
              ActivityTypeLU,
              ActivityTypeLU.id == MeterActivities.activity_type_id
        )
        .filter(MeterActivities.timestamp_start >= from_date)
        .filter(MeterActivities.timestamp_start <= to_date)
    )

    if filter_techs:
        query = query.filter(
            MeterActivities.submitting_user_id.in_(technicians)
        )

    if matching_meter_ids is not None:
        if not matching_meter_ids:
            # TRSS valid but no meters matched → return empty results
            return {
                "repairs_by_meter": [],
                "pms_by_meter": [],
                "table_rows": [],
            }
        query = query.filter(MeterActivities.meter_id.in_(matching_meter_ids))

    base_query = query.order_by(MeterActivities.timestamp_start).all()

    # Aggregate repairs and PMs
    repairs_by_meter = defaultdict(int)
    pms_by_meter = defaultdict(int)
    grouped_rows = defaultdict(lambda: {"number_of_repairs": 0, "number_of_pms": 0})

    for row in base_query:
        key = (row.date_time, row.technician, row.meter)
        if row.activity_type == "Repair":
            repairs_by_meter[row.meter] += 1
            grouped_rows[key]["number_of_repairs"] += 1
        elif row.activity_type == "Preventative Maintenance":
            pms_by_meter[row.meter] += 1
            grouped_rows[key]["number_of_pms"] += 1

    repairs_result = [{"meter": meter, "count": count} for meter, count in repairs_by_meter.items()]
    pms_result = [{"meter": meter, "count": count} for meter, count in pms_by_meter.items()]

    table_rows = []
    for (date_time, technician, meter), counts in grouped_rows.items():
        table_rows.append({
            "date_time": date_time,
            "technician": technician,
            "meter": meter,
            "number_of_repairs": counts["number_of_repairs"],
            "number_of_pms": counts["number_of_pms"],
        })

    return {
        "repairs_by_meter": repairs_result,
        "pms_by_meter": pms_result,
        "table_rows": table_rows,
    }


@maintenance_router.get(
    "/maintenance/pdf",
    tags=["Maintenance"],
    dependencies=[Depends(ScopedUser.Read)],
)
def download_parts_used_pdf(
    from_month: str = Query(..., pattern=r"^\d{4}-\d{2}$"),
    to_month: str = Query(..., pattern=r"^\d{4}-\d{2}$"),
    trss: str = Query(...),
    technicians: List[int] = Query(...),
    db: Session = Depends(get_db),
):
    try:
        from_date = datetime.strptime(from_month, "%Y-%m").replace(day=1)
        to_dt = datetime.strptime(to_month, "%Y-%m")
        year, month = to_dt.year, to_dt.month
        today = datetime.now()
        if year == today.year and month == today.month:
            to_date = today
        else:
            last_day = calendar.monthrange(year, month)[1]
            to_date = to_dt.replace(day=last_day, hour=23, minute=59, second=59)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM.")

    filter_techs = -1 not in technicians

    # Optional TRSS filtering via Locations → Meters
    matching_meter_ids = None
    if trss:
        try:
            parts = list(map(int, trss.strip().split(".")))
            if len(parts) >= 4:
                township, range_, section, quarter = parts[:4]

                location_ids = [
                    loc_id for (loc_id,) in db.query(Locations.id).filter(
                        Locations.township == township,
                        Locations.range == range_,
                        Locations.section == section,
                        Locations.quarter == quarter,
                    ).all()
                ]

                if location_ids:
                    matching_meter_ids = [
                        meter_id for (meter_id,) in db.query(Meters.id).filter(
                            Meters.location_id.in_(location_ids)
                        ).all()
                    ]
        except Exception:
            pass  # Silently skip TRSS filtering if malformed

    query = (
        db.query(
            MeterActivities.timestamp_start.label("date_time"),
            Users.full_name.label("technician"),
            Meters.serial_number.label("meter"),
            ActivityTypeLU.name.label("activity_type")
        )
        .join(Users, Users.id == MeterActivities.submitting_user_id)
        .join(Meters, Meters.id == MeterActivities.meter_id)
        .join(
              ActivityTypeLU,
              ActivityTypeLU.id == MeterActivities.activity_type_id
        )
        .filter(MeterActivities.timestamp_start >= from_date)
        .filter(MeterActivities.timestamp_start <= to_date)
    )

    if filter_techs:
        query = query.filter(MeterActivities.submitting_user_id.in_(technicians))

    if matching_meter_ids is not None:
        if not matching_meter_ids:
            return StreamingResponse(BytesIO(), media_type="application/pdf")  # Empty PDF
        query = query.filter(MeterActivities.meter_id.in_(matching_meter_ids))

    base_query = query.order_by(MeterActivities.timestamp_start).all()

    repairs_by_meter = defaultdict(int)
    pms_by_meter = defaultdict(int)
    grouped_rows = defaultdict(lambda: {"number_of_repairs": 0, "number_of_pms": 0})

    for row in base_query:
        key = (row.date_time, row.technician, row.meter)
        if row.activity_type == "Repair":
            repairs_by_meter[row.meter] += 1
            grouped_rows[key]["number_of_repairs"] += 1
        elif row.activity_type == "Preventative Maintenance":
            pms_by_meter[row.meter] += 1
            grouped_rows[key]["number_of_pms"] += 1

    table_rows = []
    for (date_time, technician, meter), counts in grouped_rows.items():
        table_rows.append({
            "date_time": date_time.strftime("%Y-%m-%d %H:%M"),
            "technician": technician,
            "meter": meter,
            "number_of_repairs": counts["number_of_repairs"],
            "number_of_pms": counts["number_of_pms"],
        })

    # Generate pie charts as base64 PNGs
    def make_pie_chart(data: dict, title: str):
        if not data:
            return ""
        fig = figure(figsize=(5, 5))
        ax = fig.add_subplot(111)
        ax.pie(
            data.values(),
            labels=data.keys(),
            autopct="%1.1f%%",
            startangle=140,
        )
        ax.set_title(title)
        buf = BytesIO()
        fig.savefig(buf, format="png", bbox_inches="tight")
        close(fig)
        return b64encode(buf.getvalue()).decode("utf-8")

    repair_chart_b64 = make_pie_chart(repairs_by_meter, "Repairs by Meter")
    pm_chart_b64 = make_pie_chart(pms_by_meter, "Preventative Maintenances by Meter")

    template = templates.get_template("maintenance_summary.html")
    html = template.render(
        from_month=from_month,
        to_month=to_month,
        repair_chart=repair_chart_b64,
        pm_chart=pm_chart_b64,
        table_rows=table_rows,
    )

    pdf_io = BytesIO()
    HTML(string=html).write_pdf(pdf_io)
    pdf_io.seek(0)

    return StreamingResponse(
        pdf_io,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=maintenance_summary.pdf"},
    )
