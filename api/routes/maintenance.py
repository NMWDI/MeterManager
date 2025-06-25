from fastapi import Depends, APIRouter, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import List
from datetime import datetime
import calendar
from fastapi.responses import StreamingResponse
from weasyprint import HTML
from io import BytesIO
from jinja2 import Template
from collections import defaultdict

from api.models.main_models import (
    Parts,
    PartsUsed,
    Users,
    Meters,
    MeterActivities,
    ActivityTypeLU,
)
from api.session import get_db
from api.enums import ScopedUser

part_router = APIRouter()

# --- Pydantic response models ---


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


@part_router.get(
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
    try:
        from_date = datetime.strptime(from_month, "%Y-%m").replace(day=1)
        to_dt = datetime.strptime(to_month, "%Y-%m")
        year, month = to_dt.year, to_dt.month
        today = datetime.now()
        if year == today.year and month == today.month:
            to_date = today
        else:
            last_day = calendar.monthrange(year, month)[1]
            to_date = to_dt.replace(
                day=last_day,
                hour=23,
                minute=59,
                second=59
            )
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid date format. Use YYYY-MM."
        )

    # Base query
    base_query = (
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
        .filter(
            MeterActivities.timestamp_start >= from_date,
            MeterActivities.timestamp_start <= to_date,
            MeterActivities.submitting_user_id.in_(technicians)
        )
        .order_by(MeterActivities.timestamp_start)
        .all()
    )

    # Aggregations
    repairs_by_meter = defaultdict(int)
    pms_by_meter = defaultdict(int)
    grouped_rows = defaultdict(
        lambda: {"number_of_repairs": 0, "number_of_pms": 0}
    )

    for row in base_query:
        key = (row.date_time, row.technician, row.meter)
        if row.activity_type == "Repair":
            repairs_by_meter[row.meter] += 1
            grouped_rows[key]["number_of_repairs"] += 1
        elif row.activity_type == "Preventative Maintenance":
            pms_by_meter[row.meter] += 1
            grouped_rows[key]["number_of_pms"] += 1

    # Serialize grouped data
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


@part_router.get(
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
            to_date = to_dt.replace(
                day=last_day,
                hour=23,
                minute=59,
                second=59
            )
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid date format. Use YYYY-MM."
        )

    usage_subq = (
        db.query(
            PartsUsed.c.part_id.label("used_part_id"),
            func.count(PartsUsed.c.part_id).label("quantity")
        )
        .join(
              MeterActivities,
              MeterActivities.id == PartsUsed.c.meter_activity_id
          )
        .filter(
            MeterActivities.timestamp_start >= from_date,
            MeterActivities.timestamp_start <= to_date,
            PartsUsed.c.part_id.in_(parts),
        )
        .group_by(PartsUsed.c.part_id)
        .subquery()
    )

    query = (
        db.query(
            Parts.id.label("id"),
            Parts.part_number,
            Parts.description,
            Parts.price,
            func.coalesce(usage_subq.c.quantity, 0).label("quantity")
        )
        .outerjoin(usage_subq, Parts.id == usage_subq.c.used_part_id)
        .filter(Parts.id.in_(parts))
        .order_by(Parts.part_number)
    )

    results = []
    running_total = 0.0
    for row in query.all():
        price = row.price or 0
        quantity = row.quantity or 0
        total = price * quantity
        running_total += total
        results.append({
            "part_number": row.part_number,
            "description": row.description,
            "price": price,
            "quantity": quantity,
            "total": total,
            "running_total": running_total,
        })

    html_template = Template("""
    <html>
      <head>
        <style>
          body { font-family: sans-serif; }
          table { width: 100%; border-collapse: collapse; margin-top: 1em; }
          th, td { border: 1px solid #ccc; padding: 6px; text-align: left; }
          th { background-color: #f5f5f5; }
        </style>
      </head>
      <body>
        <h2>Parts Usage Report</h2>
        <p>
            <strong>From:</strong>
            {{ from_month }} &nbsp;
            <strong>To:</strong>
            {{ to_month }}
        </p>
        <table>
          <thead>
            <tr>
              <th>Part #</th>
              <th>Description</th>
              <th>Price</th>
              <th>Quantity</th>
              <th>Total</th>
              <th>Running Total</th>
            </tr>
          </thead>
          <tbody>
            {% for row in rows %}
              <tr>
                <td>{{ row.part_number }}</td>
                <td>{{ row.description }}</td>
                <td>${{ "%.2f"|format(row.price) }}</td>
                <td>{{ row.quantity }}</td>
                <td>${{ "%.2f"|format(row.total) }}</td>
                <td>${{ "%.2f"|format(row.running_total) }}</td>
              </tr>
            {% endfor %}
          </tbody>
        </table>
      </body>
    </html>
    """)

    html_content = html_template.render(
        rows=results,
        from_month=from_month,
        to_month=to_month
    )
    pdf_io = BytesIO()
    HTML(string=html_content).write_pdf(pdf_io)
    pdf_io.seek(0)

    return StreamingResponse(
        pdf_io,
        media_type="application/pdf",
        headers={
            "Content-Disposition": "attachment; filename=parts_used_report.pdf"
        },
    )
