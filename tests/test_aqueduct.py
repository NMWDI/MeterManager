"""Aqueduct integration route tests using a minimal SQLite database."""

import os
from datetime import datetime, timezone
from types import SimpleNamespace

os.environ.setdefault("APPDB_ENV", ".env_test")
os.environ.setdefault("JWT_SECRET_KEY", "aqueduct-tests-only")

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from api.routes.aqueduct import (
    _to_database_timestamp,
    get_aqueduct_measurements,
    get_aqueduct_wells,
    require_aqueduct_service_account,
)
from api.schemas.aqueduct import AqueductMeasurement, AqueductWell


@pytest.fixture
def db():
    engine = create_engine(
        "sqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False}
    )
    with engine.begin() as connection:
        for ddl in [
            'CREATE TABLE "Locations" (id INTEGER PRIMARY KEY, name TEXT, latitude REAL, longitude REAL)',
            'CREATE TABLE "Wells" (id INTEGER PRIMARY KEY, name TEXT, total_depth REAL, location_id INTEGER)',
            'CREATE TABLE "ObservedPropertyTypeLU" (id INTEGER PRIMARY KEY, name TEXT, description TEXT, context TEXT)',
            'CREATE TABLE "Units" (id INTEGER PRIMARY KEY, name TEXT, name_short TEXT, description TEXT)',
            'CREATE TABLE "WellMeasurements" (id INTEGER PRIMARY KEY, timestamp DATETIME, value REAL, observed_property_id INTEGER, unit_id INTEGER, well_id INTEGER)',
            "INSERT INTO \"Locations\" VALUES (1, 'North Field', 35.1, -106.5)",
            "INSERT INTO \"Wells\" VALUES (1, 'Well A', 500.0, 1), (2, 'Well B', NULL, NULL)",
            "INSERT INTO \"ObservedPropertyTypeLU\" VALUES (1, 'Depth to water', 'Depth below ground surface', 'groundwater')",
            "INSERT INTO \"Units\" VALUES (1, 'feet', 'ft', 'Imperial length unit')",
            "INSERT INTO \"WellMeasurements\" VALUES (1, '2026-01-01 00:00:00.000000', 12.0, 1, 1, 1)",
            "INSERT INTO \"WellMeasurements\" VALUES (2, '2026-01-02 00:00:00.000000', NULL, 1, 1, 1)",
            "INSERT INTO \"WellMeasurements\" VALUES (3, '2026-01-03 00:00:00.000000', 10.0, 1, 1, 1)",
        ]:
            connection.exec_driver_sql(ddl)
    with Session(engine) as session:
        yield session
    engine.dispose()


def test_wells_include_location_and_wells_without_one(db):
    result = [AqueductWell.model_validate(row) for row in get_aqueduct_wells(db)]

    assert [well.id for well in result] == [1, 2]
    assert result[0].model_dump() == {
        "id": 1,
        "name": "Well A",
        "total_depth": 500.0,
        "location_name": "North Field",
        "latitude": 35.1,
        "longitude": -106.5,
    }
    assert result[1].location_name is None


def test_measurements_use_inclusive_start_and_join_lookup_values(db):
    result = [
        AqueductMeasurement.model_validate(row)
        for row in get_aqueduct_measurements(
            well_id=1,
            start_timestamp=datetime(2026, 1, 2),
            end_timestamp=None,
            db=db,
        )
    ]

    assert [measurement.id for measurement in result] == [2, 3]
    assert result[0].value is None
    assert result[0].observed_property_name == "Depth to water"
    assert result[0].unit_name_short == "ft"


def test_measurements_use_an_inclusive_bounded_range(db):
    result = get_aqueduct_measurements(
        well_id=1,
        start_timestamp=datetime(2026, 1, 1),
        end_timestamp=datetime(2026, 1, 2),
        db=db,
    )

    assert [measurement["id"] for measurement in result] == [1, 2]


def test_measurements_validate_range_and_distinguish_missing_well(db):
    with pytest.raises(HTTPException, match="end_timestamp") as invalid_range:
        get_aqueduct_measurements(
            well_id=1,
            start_timestamp=datetime(2026, 1, 2),
            end_timestamp=datetime(2026, 1, 1),
            db=db,
        )
    assert invalid_range.value.status_code == 422

    with pytest.raises(HTTPException, match="Well not found") as missing_well:
        get_aqueduct_measurements(
            well_id=999,
            start_timestamp=datetime(2026, 1, 1),
            end_timestamp=None,
            db=db,
        )
    assert missing_well.value.status_code == 404

    assert (
        get_aqueduct_measurements(
            well_id=1,
            start_timestamp=datetime(2027, 1, 1),
            end_timestamp=None,
            db=db,
        )
        == []
    )


def test_offset_timestamps_are_normalized_to_utc_naive():
    assert _to_database_timestamp(
        datetime(2026, 1, 1, 6, tzinfo=timezone.utc)
    ) == datetime(2026, 1, 1, 6)


def test_aqueduct_access_requires_technician_service_account():
    technician_service_account = SimpleNamespace(
        is_service_account=True, user_role=SimpleNamespace(name="Technician")
    )
    assert require_aqueduct_service_account(technician_service_account) is technician_service_account

    for user in [
        SimpleNamespace(is_service_account=False, user_role=SimpleNamespace(name="Technician")),
        SimpleNamespace(is_service_account=True, user_role=SimpleNamespace(name="Admin")),
    ]:
        with pytest.raises(HTTPException) as rejected:
            require_aqueduct_service_account(user)
        assert rejected.value.status_code == 401
