from fastapi import Depends, APIRouter, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
from datetime import datetime
import calendar
from fastapi.responses import StreamingResponse
from weasyprint import HTML
from io import BytesIO
from jinja2 import Template
from collections import defaultdict
from matplotlib.pyplot import figure, close
from base64 import b64encode

from api.models.main_models import (
    Users,
    Meters,
    MeterActivities,
    ActivityTypeLU,
)
from api.session import get_db
from api.enums import ScopedUser

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

    # If -1 is in the list, remove technician filtering (include all)
    filter_techs = -1 not in technicians

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

    base_query = query.order_by(MeterActivities.timestamp_start).all()

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

    # If -1 is in the list, remove technician filtering (include all)
    filter_techs = -1 not in technicians

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

    # Helper: create pie chart image as base64
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

    # Jinja2 template
    html_template = Template("""
    <html>
      <head>
        <style>
          body { font-family: sans-serif; padding: 1em; }
          h2 { margin-top: 2em; }
          table { width: 100%; border-collapse: collapse; margin-top: 1em; }
          th, td { border: 1px solid #ccc; padding: 6px; text-align: left; }
          th { background-color: #f5f5f5; }
          .chart { margin-top: 2em; text-align: center; }
        </style>
      </head>
      <body>
        <h1>Maintenance Summary</h1>
        <p><strong>From:</strong> {{ from_month }} &nbsp;&nbsp; <strong>To:</strong> {{ to_month }}</p>

        {% if repair_chart %}
        <div class="chart">
          <h2>Repairs by Meter</h2>
          <img src="data:image/png;base64,{{ repair_chart }}" />
        </div>
        {% endif %}

        {% if pm_chart %}
        <div class="chart">
          <h2>Preventative Maintenance by Meter</h2>
          <img src="data:image/png;base64,{{ pm_chart }}" />
        </div>
        {% endif %}

        <h2>Detailed Activity Table</h2>
        <table>
          <thead>
            <tr>
              <th>Date / Time</th>
              <th>Technician</th>
              <th>Meter</th>
              <th>Number of Repairs</th>
              <th>Number of Preventative Maintenances</th>
            </tr>
          </thead>
          <tbody>
            {% for row in table_rows %}
              <tr>
                <td>{{ row.date_time }}</td>
                <td>{{ row.technician }}</td>
                <td>{{ row.meter }}</td>
                <td>{{ row.number_of_repairs }}</td>
                <td>{{ row.number_of_pms }}</td>
              </tr>
            {% endfor %}
          </tbody>
        </table>
      </body>
    </html>
    """)

    html = html_template.render(
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
