
from typing import List

from fastapi import Depends, APIRouter, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, and_


from api.schemas import well_schemas
from api.models.main_models import WellMeasurements, Wells
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

chlorides_router = APIRouter()

@chlorides_router.get(
    "/chlorides",
    dependencies=[Depends(ScopedUser.Read)],
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


@chlorides_router.post(
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

@chlorides_router.patch(
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

@chlorides_router.delete(
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

