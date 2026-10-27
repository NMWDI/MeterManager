"""Maintenance report regression tests using an isolated, minimal SQLite database."""

import os
from datetime import date, datetime

os.environ.setdefault("APPDB_ENV", ".env_test")
os.environ.setdefault("JWT_SECRET_KEY", "maintenance-tests-only")
os.environ.setdefault("MPLCONFIGDIR", "/tmp/metermanager-test-matplotlib")

import pytest
from sqlalchemy import create_engine, insert
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from api.models.meter import MeterActivities
from api.routes import maintenance
from api.schemas.maintenance import MaintenanceSummaryResponse


@pytest.fixture
def db():
    engine = create_engine(
        "sqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False}
    )
    with engine.begin() as conn:
        for ddl in [
            'CREATE TABLE "Users" (id INTEGER PRIMARY KEY, full_name TEXT)',
            'CREATE TABLE "Locations" (id INTEGER PRIMARY KEY, trss TEXT)',
            'CREATE TABLE "Meters" (id INTEGER PRIMARY KEY, serial_number TEXT, location_id INTEGER)',
            'CREATE TABLE "ActivityTypeLU" (id INTEGER PRIMARY KEY, name TEXT)',
            'CREATE TABLE "MeterActivities" (id INTEGER PRIMARY KEY, timestamp_start DATETIME, submitting_user_id INTEGER, meter_id INTEGER, activity_type_id INTEGER)',
            "INSERT INTO \"Users\" VALUES (1, 'Test Technician'), (2, 'Other Technician')",
            "INSERT INTO \"Locations\" VALUES (1, '123456'), (2, '654321')",
            "INSERT INTO \"Meters\" VALUES (1, 'METER-1', 1), (2, 'METER-2', 2)",
            "INSERT INTO \"ActivityTypeLU\" VALUES (4, 'Preventative Maintenance'), (5, 'Repair'), (9, 'Location Only'), (1, 'Install')",
        ]:
            conn.exec_driver_sql(ddl)
    with Session(engine) as session:
        yield session
    engine.dispose()


def add_activity(
    db, activity_type=9, timestamp=datetime(2026, 9, 15, 12), technician=1, meter=1
):
    db.execute(
        insert(MeterActivities.__table__).values(
            timestamp_start=timestamp,
            submitting_user_id=technician,
            meter_id=meter,
            activity_type_id=activity_type,
        )
    )
    db.commit()


def summary(db, **filters):
    return maintenance.get_maintenance_summary(
        **{
            **dict(
                from_date=date(2026, 9, 1),
                to_date=date(2026, 9, 30),
                trss="",
                technicians=[-1],
            ),
            **filters,
        },
        db=db,
    )


def test_separate_counts_and_combined_chart(db):
    for kind, count in [(4, 58), (9, 62), (5, 4), (1, 2)]:
        for _ in range(count):
            add_activity(db, activity_type=kind)
    result = MaintenanceSummaryResponse.model_validate(summary(db))
    assert (result.total_repairs, result.total_pms, result.total_location_only) == (
        4,
        58,
        62,
    )
    assert [(r.meter, r.count) for r in result.pms_by_meter] == [("METER-1", 120)]
    assert [(r.meter, r.count) for r in result.repairs_by_meter] == [("METER-1", 4)]
    assert len(result.table_rows) == 1
    row = result.table_rows[0]
    assert (row.number_of_repairs, row.number_of_pms, row.number_of_location_only) == (
        4,
        58,
        62,
    )


def test_location_only_row_is_not_pm(db):
    add_activity(db)
    result = summary(db)
    assert result["table_rows"][0]["number_of_pms"] == 0
    assert result["table_rows"][0]["number_of_location_only"] == 1
    assert result["pms_by_meter"][0]["count"] == 1


def test_inclusive_dates_and_filters(db):
    for timestamp in [
        datetime(2026, 9, 1),
        datetime(2026, 9, 30, 23, 59, 59, 999999),
        datetime(2026, 8, 31, 23, 59, 59),
        datetime(2026, 10, 1),
    ]:
        add_activity(db, timestamp=timestamp)
    add_activity(db, technician=2)
    add_activity(db, meter=2)
    result = summary(db, technicians=[1], trss="123")
    assert result["total_location_only"] == 2
    assert sum(r["count"] for r in result["pms_by_meter"]) == 2


def test_empty_results_have_zero_totals(db):
    result = MaintenanceSummaryResponse.model_validate(summary(db))
    assert (result.total_repairs, result.total_pms, result.total_location_only) == (
        0,
        0,
        0,
    )
    assert result.table_rows == result.pms_by_meter == result.repairs_by_meter == []


def test_empty_meter_selection_has_zero_totals(db):
    db.connection().exec_driver_sql('DELETE FROM "Meters"')
    result = MaintenanceSummaryResponse.model_validate(summary(db, trss="123"))
    assert result.total_repairs == result.total_pms == result.total_location_only == 0


def test_api_serializes_totals_and_location_only(db):
    add_activity(db)
    # FastAPI applies this response model before serializing the endpoint result.
    result = MaintenanceSummaryResponse.model_validate(summary(db)).model_dump(
        mode="json"
    )
    assert result["total_location_only"] == 1
    assert result["total_pms"] == 0
    assert result["table_rows"][0]["number_of_location_only"] == 1


def test_pdf_uses_separate_totals(db, monkeypatch):
    for kind in [4, 9, 5]:
        add_activity(db, activity_type=kind)
    rendered = {}

    class CaptureHTML:
        def __init__(self, string):
            rendered["html"] = string

        def write_pdf(self, output):
            output.write(b"%PDF-test")

    monkeypatch.setattr(maintenance, "HTML", CaptureHTML)
    maintenance.download_maintenance_summary_pdf(
        from_date=date(2026, 9, 1),
        to_date=date(2026, 9, 30),
        trss="",
        technicians=[-1],
        db=db,
    )
    assert "Total Location Only" in rendered["html"]
    assert "Number of Location Only" in rendered["html"]
    assert "{{" not in rendered["html"]
    assert rendered["html"].count("<td>1</td>") == 3
