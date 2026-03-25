from typing import List, Optional
from datetime import datetime, date

from fastapi import Depends, APIRouter, Query, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import select

from api.schemas import well
from api.models.meter import ObservedPropertyTypeLU, Units
from api.models.well import WellMeasurements
from api.session import get_db
from api.auth.dependencies import ScopedUser
from api.services import well_measurements as well_measurement_service

authenticated_well_measurement_router = APIRouter()
public_well_measurement_router = APIRouter()


@authenticated_well_measurement_router.post(
    "/waterlevels",
    dependencies=[Depends(ScopedUser.WellMeasurementWrite)],
    response_model=well.WellMeasurement,
    tags=["WaterLevels"],
)
def add_waterlevel(
    waterlevel: well.NewWaterLevelMeasurement, db: Session = Depends(get_db)
):
    # Create the well measurement from the form, qualify with units and property type
    well_measurement = WellMeasurements(
        timestamp=datetime.combine(
            waterlevel.timestamp.date(), waterlevel.timestamp.time()
        ),  # Convert to UTC
        value=waterlevel.value,
        observed_property_id=db.scalars(
            select(ObservedPropertyTypeLU.id).where(
                ObservedPropertyTypeLU.name == "Depth to water"
            )
        ).first(),
        submitting_user_id=waterlevel.submitting_user_id,
        unit_id=db.scalars(select(Units.id).where(Units.name == "feet")).first(),
        well_id=waterlevel.well_id,
    )

    db.add(well_measurement)
    db.commit()

    return well_measurement


@public_well_measurement_router.get(
    "/waterlevels/woodpeckers",
    response_model=List[well.WellMeasurementDTO],
    tags=["WaterLevels"],
)
def read_woodpecker_waterlevels(
    well_id: int = Query(..., description="At least one well ID is required"),
):
    try:
        return well_measurement_service.read_woodpecker_waterlevels(well_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@public_well_measurement_router.get(
    "/waterlevels",
    response_model=List[well.WellMeasurementDTO],
    tags=["WaterLevels"],
)
def read_waterlevels(
    well_ids: List[int] = Query(..., description="One or more well IDs"),
    from_date: Optional[date] = Query(
        None, description="Start date in ISO format, 'YYYY-MM-DD' (optional)"
    ),
    to_date: Optional[date] = Query(
        None, description="End date in ISO format, 'YYYY-MM-DD' (optional)"
    ),
    isAveragingAllWells: bool = Query(False),
    isComparingTo1970Average: bool = Query(False),
    comparisonYear: Optional[str] = Query(None, pattern=r"^$|^\d{4}$"),
    db: Session = Depends(get_db),
):
    try:
        return well_measurement_service.read_waterlevels(
            db=db,
            well_ids=well_ids,
            from_date=from_date,
            to_date=to_date,
            is_averaging_all_wells=isAveragingAllWells,
            is_comparing_to_1970_average=isComparingTo1970Average,
            comparison_year=comparisonYear,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@public_well_measurement_router.get(
    "/waterlevels/report-averages",
    tags=["WaterLevels"],
)
def read_waterlevel_report_averages(
    well_ids: List[int] = Query(..., description="One or more well IDs"),
    from_date: Optional[date] = Query(
        None, description="Start date in ISO format, 'YYYY-MM-DD' (optional)"
    ),
    to_date: Optional[date] = Query(
        None, description="End date in ISO format, 'YYYY-MM-DD' (optional)"
    ),
    db: Session = Depends(get_db),
):
    """
    Report aggregates:
    - per-well average depth-to-water for the derived bucket (month or year)
    - all-wells average depth-to-water for the derived bucket (month or year)

    Bucket is derived from range:
      >= 365 days => year buckets
      else => month buckets
    """

    if from_date is None and to_date is None:
        raise HTTPException(
            status_code=400, detail="from_date and/or to_date is required for reports"
        )

    return well_measurement_service.get_waterlevel_report_averages(
        well_ids=well_ids,
        from_date=from_date,
        to_date=to_date,
        db=db,
    )


@authenticated_well_measurement_router.get(
    "/waterlevels/pdf",
    dependencies=[Depends(ScopedUser.Read)],
    tags=["WaterLevels"],
)
def download_waterlevels_pdf(
    well_ids: List[int] = Query(..., description="One or more well IDs"),
    from_date: date = Query(..., description="Start date in ISO format, 'YYYY-MM-DD'"),
    to_date: date = Query(..., description="End date in ISO format, 'YYYY-MM-DD'"),
    isAveragingAllWells: bool = Query(False),
    isComparingTo1970Average: bool = Query(False),
    comparisonYear: Optional[str] = Query(None, pattern=r"^$|^\d{4}$"),
    db: Session = Depends(get_db),
):
    """
    Generate a PDF water-level report between two dates.
    Reuses the read_waterlevels() endpoint for data.
    """

    try:
        pdf_io = well_measurement_service.build_waterlevels_pdf(
            db=db,
            well_ids=well_ids,
            from_date=from_date,
            to_date=to_date,
            is_averaging_all_wells=isAveragingAllWells,
            is_comparing_to_1970_average=isComparingTo1970Average,
            comparison_year=comparisonYear,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    return StreamingResponse(
        pdf_io,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=waterlevels_report.pdf"},
    )


@authenticated_well_measurement_router.patch(
    "/waterlevels",
    dependencies=[Depends(ScopedUser.Admin)],
    response_model=well.WellMeasurement,
    tags=["WaterLevels"],
)
def patch_waterlevel(
    waterlevel_patch: well.PatchWaterLevel, db: Session = Depends(get_db)
):
    # Find the measurement
    well_measurement = db.scalars(
        select(WellMeasurements).where(
            WellMeasurements.id == waterlevel_patch.levelmeasurement_id
        )
    ).first()

    # Update the fields, all are mandatory
    well_measurement.submitting_user_id = waterlevel_patch.submitting_user_id
    well_measurement.timestamp = waterlevel_patch.timestamp
    well_measurement.value = waterlevel_patch.value

    db.commit()

    return well_measurement


@authenticated_well_measurement_router.delete(
    "/waterlevels",
    dependencies=[Depends(ScopedUser.Admin)],
    tags=["WaterLevels"],
)
def delete_waterlevel(waterlevel_id: int, db: Session = Depends(get_db)):
    # Find the measurement
    well_measurement = db.scalars(
        select(WellMeasurements).where(WellMeasurements.id == waterlevel_id)
    ).first()

    db.delete(well_measurement)
    db.commit()

    return True
