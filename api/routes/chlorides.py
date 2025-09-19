from typing import Optional, List
from datetime import datetime
import calendar
import statistics
from fastapi.responses import StreamingResponse
from weasyprint import HTML
from io import BytesIO
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import and_, select
from sqlalchemy.orm import Session, joinedload

from api.schemas import well_schemas
from api.models.main_models import WellMeasurements, Wells, Locations, WellUseLU
from api.session import get_db
from api.enums import ScopedUser, SortDirection

from pathlib import Path
from jinja2 import Environment, FileSystemLoader, select_autoescape

import matplotlib
matplotlib.use("Agg")  # Force non-GUI backend

TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"

templates = Environment(
    loader=FileSystemLoader(TEMPLATES_DIR),
    autoescape=select_autoescape(["html", "xml"])
)

authenticated_chlorides_router = APIRouter()
public_chlorides_router = APIRouter()

@public_chlorides_router.get(
    "/chlorides",
    response_model=List[well_schemas.WellMeasurementDTO],
    tags=["Chlorides"],
)
def read_chlorides(
    chloride_group_id: int = Query(..., description="Chloride group ID to filter by"),
    db: Session = Depends(get_db)
):
    chloride_concentration_group_id = 5

    return db.scalars(
        select(WellMeasurements)
        .options(
            joinedload(WellMeasurements.submitting_user),
            joinedload(WellMeasurements.well)
        )
        .join(Wells, Wells.id == WellMeasurements.well_id)
        .where(
            and_(
                WellMeasurements.observed_property_id == chloride_concentration_group_id,
                Wells.chloride_group_id == chloride_group_id
            )
        )
    ).all()


@public_chlorides_router.get(
    "/chloride_groups",
    response_model=List[well_schemas.ChlorideGroupResponse],
    tags=["Chlorides"],
)
def get_chloride_groups(
    sort_direction: SortDirection = SortDirection.Ascending,
    db: Session = Depends(get_db),
):
    query = (
        select(Wells)
        .options(joinedload(Wells.location), joinedload(Wells.use_type))
        .join(Locations, isouter=True)
        .join(WellUseLU, isouter=True)
        .where(Wells.chloride_group_id.isnot(None))
    )

    if sort_direction == SortDirection.Ascending:
        query = query.order_by(Wells.chloride_group_id.asc())
    else:
        query = query.order_by(Wells.chloride_group_id.desc())

    wells = db.scalars(query).all()

    groups = {}
    for well in wells:
        group_id = well.chloride_group_id
        if group_id not in groups:
            groups[group_id] = []
        if well.ra_number:
            groups[group_id].append(well.ra_number)

    return [
        {"id": group_id, "names": sorted(names)}
        for group_id, names in groups.items()
    ]

class MinMaxAvgMedCount(BaseModel):
    min: Optional[float] = None
    max: Optional[float] = None
    avg: Optional[float] = None
    median: Optional[float] = None
    count: int = 0


class ChlorideReportNums(BaseModel):
    north: MinMaxAvgMedCount
    south: MinMaxAvgMedCount
    east: MinMaxAvgMedCount
    west: MinMaxAvgMedCount


@authenticated_chlorides_router.get(
    "/chlorides/report",
    dependencies=[Depends(ScopedUser.Read)],
    response_model=ChlorideReportNums,
    tags=["Chlorides"],
)
def get_chlorides_report(
    from_month: Optional[str] = Query(
        None,
        description="Month start, 'YYYY-MM'",
        pattern=r"^$|^\d{4}-\d{2}$",
    ),
    to_month: Optional[str] = Query(
        None,
        description="Month end, 'YYYY-MM'",
        pattern=r"^$|^\d{4}-\d{2}$",
    ),
    db: Session = Depends(get_db),
):
    """
    Returns min/max/avg for north/south/east/west halves **within the SE quadrant of New Mexico**,
    over the specified [from_month, to_month] inclusive range, for chloride wells in the given group.
    """

    CHLORIDE_OBSERVED_PROPERTY_ID = 5

    # Parse months
    start_dt = _parse_month(from_month) if from_month else None
    end_dt = _parse_month(to_month) if to_month else None
    if start_dt and not end_dt:
        end_dt = start_dt
    if end_dt:
        end_dt = _month_end(end_dt)

    stmt = (
        select(
            WellMeasurements.value,
            Locations.latitude,
            Locations.longitude,
        )
        .join(Wells, Wells.id == WellMeasurements.well_id)
        .join(Locations, Locations.id == Wells.location_id)
        .where(
            and_(
                WellMeasurements.observed_property_id == CHLORIDE_OBSERVED_PROPERTY_ID,
                Locations.latitude.is_not(None),
                Locations.longitude.is_not(None),
                # Restrict to NM bbox first
                Locations.latitude >= NM_LAT_MIN,
                Locations.latitude <= NM_LAT_MAX,
                Locations.longitude >= NM_LON_MIN,
                Locations.longitude <= NM_LON_MAX,
                # Time range (optional)
                *( [WellMeasurements.timestamp >= start_dt] if start_dt else [] ),
                *( [WellMeasurements.timestamp <= end_dt] if end_dt else [] ),
            )
        )
    )

    rows = db.execute(stmt).all()

    se_rows = [
        (val, lat, lon)
        for (val, lat, lon) in rows
        if (lat is not None and lon is not None
            and SE_MIN_LAT <= float(lat) <= SE_MAX_LAT
            and SE_MIN_LON <= float(lon) <= SE_MAX_LON)
    ]

    north_vals: List[float] = []
    south_vals: List[float] = []
    east_vals:  List[float] = []
    west_vals:  List[float] = []

    for val, lat, lon in se_rows:
        # North vs South halves within the SE quadrant
        if float(lat) >= SE_MID_LAT:
            north_vals.append(float(val))
        else:
            south_vals.append(float(val))

        # East vs West halves within the SE quadrant
        if float(lon) >= SE_MID_LON:
            east_vals.append(float(val))
        else:
            west_vals.append(float(val))

    return ChlorideReportNums(
        north=_stats(north_vals),
        south=_stats(south_vals),
        east=_stats(east_vals),
        west=_stats(west_vals),
    )


@authenticated_chlorides_router.get(
    "/chlorides/report/pdf",
    dependencies=[Depends(ScopedUser.Read)],
    tags=["Chlorides"],
)
def download_chlorides_report_pdf(
    from_month: Optional[str] = Query(
        None,
        description="Month start, 'YYYY-MM'",
        pattern=r"^$|^\d{4}-\d{2}$",
    ),
    to_month: Optional[str] = Query(
        None,
        description="Month end, 'YYYY-MM'",
        pattern=r"^$|^\d{4}-\d{2}$",
    ),
    db: Session = Depends(get_db),
):
    """
    Generate a PDF chloride report (north/south/east/west stats)
    for the SE quadrant of New Mexico.
    """
    # Re-use your existing logic by calling the data endpoint’s function
    report = get_chlorides_report(from_month=from_month, to_month=to_month, db=db)

    # Render HTML using a template
    template = templates.get_template("chlorides_report.html")
    html_content = template.render(
        report=report,
        from_month=from_month,
        to_month=to_month,
    )

    # Convert to PDF
    pdf_io = BytesIO()
    HTML(string=html_content).write_pdf(pdf_io)
    pdf_io.seek(0)

    return StreamingResponse(
        pdf_io,
        media_type="application/pdf",
        headers={
            "Content-Disposition": "attachment; filename=chlorides_report.pdf"
        },
    )

@authenticated_chlorides_router.post(
    "/chlorides",
    dependencies=[Depends(ScopedUser.WellMeasurementWrite)],
    response_model=well_schemas.ChlorideMeasurement,
    tags=["Chlorides"],
)
def add_chloride_measurement(
    chloride_measurement: well_schemas.WellMeasurement,
    db: Session = Depends(get_db),
):
    # Create a new chloride measurement as a WellMeasurement
    well_measurement = WellMeasurements(
        timestamp = chloride_measurement.timestamp,
        value = chloride_measurement.value,
        observed_property_id = 5,  # Chloride Concentration
        submitting_user_id = chloride_measurement.submitting_user_id,
        unit_id = chloride_measurement.unit_id,
        well_id = chloride_measurement.well_id
    )

    db.add(well_measurement)
    db.commit()

    return well_measurement

@authenticated_chlorides_router.patch(
    "/chlorides",
    dependencies=[Depends(ScopedUser.WellMeasurementWrite)],
    response_model=well_schemas.WellMeasurement,
    tags=["Chlorides"],
)
def patch_chloride_measurement(
    chloride_measurement_patch: well_schemas.PatchChlorideMeasurement,
    db: Session = Depends(get_db),
):
    # Find the measurement
    well_measurement = (
        db.scalars(select(WellMeasurements).where(WellMeasurements.id == chloride_measurement_patch.id)).first()
    )

    # Update the fields, all are mandatory
    well_measurement.submitting_user_id = chloride_measurement_patch.submitting_user_id
    well_measurement.timestamp = chloride_measurement_patch.timestamp
    well_measurement.value = chloride_measurement_patch.value
    well_measurement.unit_id = chloride_measurement_patch.unit_id
    well_measurement.well_id = chloride_measurement_patch.well_id

    db.commit()

    return well_measurement

@authenticated_chlorides_router.delete(
    "/chlorides",
    dependencies=[Depends(ScopedUser.Admin)],
    tags=["Chlorides"],
)
def delete_chloride_measurement(chloride_measurement_id: int, db: Session = Depends(get_db)):
    # Find the measurement
    well_measurement = (
        db.scalars(select(WellMeasurements).where(WellMeasurements.id == chloride_measurement_id)).first()
    )

    db.delete(well_measurement)
    db.commit()

    return True


def _parse_month(m: Optional[str]) -> Optional[datetime]:
    """
    Accepts 'YYYY-MM' or 'YYYY MM'. Returns the first day of month at 00:00:00.
    """
    if not m:
        return None
    m = m.strip()
    # Try 'YYYY-MM'
    for fmt in ("%Y-%m", "%Y %m"):
        try:
            dt = datetime.strptime(m, fmt)
            return dt.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        except ValueError:
            continue
    raise HTTPException(status_code=400, detail="Invalid month format. Use 'YYYY-MM' or 'YYYY MM'.")

def _month_end(dt: datetime) -> datetime:
    last_day = calendar.monthrange(dt.year, dt.month)[1]
    return dt.replace(day=last_day, hour=23, minute=59, second=59, microsecond=999999)

def _stats(values: List[Optional[float]]) -> MinMaxAvgMedCount:
    clean = [v for v in values if v is not None]
    if not clean:
        return MinMaxAvgMedCount()
    
    return MinMaxAvgMedCount(
        min=min(clean),
        max=max(clean),
        avg=sum(clean) / len(clean),
        median=statistics.median(clean),
        count=len(clean),
    )

# Approx NM bounding box (degrees)
NM_LAT_MIN = 33.12500
NM_LAT_MAX = 34.12500
NM_LON_MIN = -105.25000
NM_LON_MAX = -104.25000

# Precompute midlines for quadrants
NM_MID_LAT = (NM_LAT_MIN + NM_LAT_MAX) / 2.0
NM_MID_LON = (NM_LON_MIN + NM_LON_MAX) / 2.0

# Southeast quadrant bounds
SE_MIN_LAT = NM_LAT_MIN
SE_MAX_LAT = NM_MID_LAT
SE_MIN_LON = NM_MID_LON
SE_MAX_LON = NM_LON_MAX

SE_MID_LAT = (SE_MIN_LAT + SE_MAX_LAT) / 2.0
SE_MID_LON = (SE_MIN_LON + SE_MAX_LON) / 2.0
