from typing import Optional, List
from datetime import datetime, date
import statistics
from fastapi.responses import StreamingResponse
from weasyprint import HTML
from io import BytesIO
from fastapi import APIRouter, Depends, Query
from sqlalchemy import and_, select
from sqlalchemy.orm import Session, joinedload

from api.chlorides_geometry import GEOMETRY, ANCHORS, REPORT_BOUNDS, classify_location
from api.schemas import chlorides
from api.schemas import well
from api.models.location import Locations
from api.models.well import WellMeasurements, Wells, WellUseLU
from api.session import get_db
from api.auth.dependencies import ScopedUser
from api.enums import SortDirection

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
    response_model=List[well.WellMeasurementDTO],
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
    response_model=List[well.ChlorideGroupResponse],
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


@authenticated_chlorides_router.get(
    "/chlorides/report/geometry",
    dependencies=[Depends(ScopedUser.Read)],
    tags=["Chlorides"],
)
def get_chlorides_report_geometry():
    return GEOMETRY


@authenticated_chlorides_router.get(
    "/chlorides/report",
    dependencies=[Depends(ScopedUser.Read)],
    response_model=chlorides.ChlorideReportNums,
    tags=["Chlorides"],
)
def get_chlorides_report(
    from_date: date = Query(..., description="Start date in ISO format, 'YYYY-MM-DD'"),
    to_date: date = Query(..., description="End date in ISO format, 'YYYY-MM-DD'"),
    db: Session = Depends(get_db),
):
    """Summarize chloride measurements in the four highway-defined report regions."""
    min_lon, min_lat, max_lon, max_lat = REPORT_BOUNDS

    CHLORIDE_OBSERVED_PROPERTY_ID = 5

    # Convert to datetimes for inclusive range
    start_dt = datetime.combine(from_date, datetime.min.time())
    end_dt = datetime.combine(to_date, datetime.max.time())

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
                # Restrict to the report rectangle before polygon classification
                Locations.latitude >= min_lat,
                Locations.latitude <= max_lat,
                Locations.longitude >= min_lon,
                Locations.longitude <= max_lon,
                WellMeasurements.timestamp >= start_dt,
                WellMeasurements.timestamp <= end_dt,
            )
        )
    )

    rows = db.execute(stmt).all()

    values = {key: [] for key in ("north_west", "north_east", "south_west", "south_east")}
    for value, latitude, longitude in rows:
        if value is None or latitude is None or longitude is None:
            continue
        region = classify_location(float(latitude), float(longitude))
        if region is not None:
            values[region].append(float(value))

    return chlorides.ChlorideReportNums(**{
        key: _stats(region_values) for key, region_values in values.items()
    })


@authenticated_chlorides_router.get(
    "/chlorides/report/pdf",
    dependencies=[Depends(ScopedUser.Read)],
    tags=["Chlorides"],
)
def download_chlorides_report_pdf(
    from_date: date = Query(..., description="Start date in ISO format, 'YYYY-MM-DD'"),
    to_date: date = Query(..., description="End date in ISO format, 'YYYY-MM-DD'"),
    db: Session = Depends(get_db),
):
    """
    Generate a PDF chloride report (north-west/north-east/south-west/south-east stats)
    for the highway-defined Roswell report area.
    """
    # Re-use existing logic
    report = get_chlorides_report(from_date=from_date, to_date=to_date, db=db)

    # Render HTML using a template
    template = templates.get_template("chlorides_report.html")
    html_content = template.render(
        report=report,
        geometry=GEOMETRY,
        anchors=ANCHORS,
        from_date=from_date,
        to_date=to_date,
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
    response_model=well.ChlorideMeasurement,
    tags=["Chlorides"],
)
def add_chloride_measurement(
    chloride_measurement: well.WellMeasurement,
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
    response_model=well.WellMeasurement,
    tags=["Chlorides"],
)
def patch_chloride_measurement(
    chloride_measurement_patch: well.PatchChlorideMeasurement,
    db: Session = Depends(get_db),
):
    well_measurement = (
        db.scalars(
            select(WellMeasurements)
            .where(WellMeasurements.id == chloride_measurement_patch.id)
        ).first()
    )

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


def _stats(values: List[Optional[float]]) -> chlorides.MinMaxAvgMedCount:
    clean = [v for v in values if v is not None]
    if not clean:
        return chlorides.MinMaxAvgMedCount()
    
    return chlorides.MinMaxAvgMedCount(
        min=min(clean),
        max=max(clean),
        avg=sum(clean) / len(clean),
        median=statistics.median(clean),
        count=len(clean),
    )
