from typing import List, Optional

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Table,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from api.models.base import Base


class ServiceTypeLU(Base):
    __tablename__ = "ServiceTypeLU"
    service_name: Mapped[str]
    description: Mapped[str]


ServicesPerformed = Table(
    "ServicesPerformed",
    Base.metadata,
    Column("meter_activity_id", ForeignKey("MeterActivities.id"), nullable=False),
    Column("service_type_id", ForeignKey("ServiceTypeLU.id"), nullable=False),
)


class NoteTypeLU(Base):
    __tablename__ = "NoteTypeLU"
    note: Mapped[str]
    details: Mapped[str]
    slug: Mapped[str]
    commonly_used: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


Notes = Table(
    "Notes",
    Base.metadata,
    Column("meter_activity_id", ForeignKey("MeterActivities.id"), nullable=False),
    Column("note_type_id", ForeignKey("NoteTypeLU.id"), nullable=False),
)


class Meters(Base):
    __tablename__ = "Meters"
    serial_number: Mapped[str] = mapped_column(String, nullable=False)
    contact_name: Mapped[Optional[str]] = mapped_column(String)
    contact_phone: Mapped[Optional[str]] = mapped_column(String)
    notes: Mapped[Optional[str]] = mapped_column(String)
    price: Mapped[Optional[float]] = mapped_column(Numeric(10, 2))

    meter_type_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("MeterTypeLU.id"), nullable=False
    )
    status_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("MeterStatusLU.id"), nullable=False
    )
    well_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("Wells.id"), nullable=False
    )
    location_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("Locations.id"), nullable=False
    )
    register_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("meter_registers.id"), nullable=True
    )
    water_users: Mapped[Optional[str]] = mapped_column(String)
    meter_owner: Mapped[Optional[str]] = mapped_column(String)

    meter_type: Mapped["MeterTypeLU"] = relationship()
    meter_register: Mapped["meterRegisters"] = relationship()
    status: Mapped["MeterStatusLU"] = relationship()
    well: Mapped["Wells"] = relationship("Wells", back_populates="meters")
    location: Mapped["Locations"] = relationship()


class MeterTypeLU(Base):
    __tablename__ = "MeterTypeLU"
    brand: Mapped[str] = mapped_column(String)
    series: Mapped[str] = mapped_column(String)
    model: Mapped[str] = mapped_column(String)
    size: Mapped[float] = mapped_column(Float)
    description: Mapped[str] = mapped_column(String)
    in_use: Mapped[bool] = mapped_column(Boolean, nullable=False)


class MeterStatusLU(Base):
    __tablename__ = "MeterStatusLU"
    status_name: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(String)


class MeterActivities(Base):
    __tablename__ = "MeterActivities"
    timestamp_start: Mapped[DateTime] = mapped_column(DateTime, nullable=False)
    timestamp_end: Mapped[DateTime] = mapped_column(DateTime, nullable=False)
    description: Mapped[str] = mapped_column(String)
    submitting_user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("Users.id"), nullable=False
    )
    meter_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("Meters.id"), nullable=False
    )
    activity_type_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("ActivityTypeLU.id"), nullable=False
    )
    location_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("Locations.id"), nullable=False
    )
    ose_share: Mapped[bool] = mapped_column(Boolean, nullable=False)
    water_users: Mapped[str] = mapped_column(String)
    work_order_id: Mapped[int] = mapped_column(Integer, ForeignKey("work_orders.id"))

    submitting_user: Mapped["Users"] = relationship()
    meter: Mapped["Meters"] = relationship()
    activity_type: Mapped["ActivityTypeLU"] = relationship()
    location: Mapped["Locations"] = relationship()
    services_performed: Mapped[List["ServiceTypeLU"]] = relationship(
        "ServiceTypeLU", secondary=ServicesPerformed
    )
    notes: Mapped[List["NoteTypeLU"]] = relationship("NoteTypeLU", secondary=Notes)
    work_order: Mapped["workOrders"] = relationship()
    well: Mapped["Wells"] = relationship(
        "Wells",
        primaryjoin="MeterActivities.location_id == Wells.location_id",
        foreign_keys="MeterActivities.location_id",
        viewonly=True,
    )
    photos: Mapped[List["MeterActivityPhotos"]] = relationship(
        "MeterActivityPhotos", back_populates="meter_activity", cascade="all, delete"
    )
    parts_used_links: Mapped[list["PartsUsed"]] = relationship(
        back_populates="meter_activity",
        cascade="all, delete-orphan",
    )


class MeterActivityPhotos(Base):
    __tablename__ = "MeterActivityPhotos"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True, autoincrement=True
    )
    meter_activity_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("MeterActivities.id", ondelete="CASCADE"), nullable=False
    )
    file_name: Mapped[str] = mapped_column(String, nullable=False)
    gcs_path: Mapped[str] = mapped_column(String, nullable=False)
    uploaded_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    original_file_name = Column(String, nullable=True)
    meter_activity: Mapped["MeterActivities"] = relationship(
        "MeterActivities", back_populates="photos"
    )


class ActivityTypeLU(Base):
    __tablename__ = "ActivityTypeLU"
    name: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(String)
    permission: Mapped[str] = mapped_column(String)


class MeterObservations(Base):
    __tablename__ = "MeterObservations"
    timestamp: Mapped[DateTime] = mapped_column(DateTime, nullable=False)
    value: Mapped[float] = mapped_column(Float, nullable=False)
    notes: Mapped[str] = mapped_column(String)
    ose_share: Mapped[bool] = mapped_column(Boolean, nullable=False)
    submitting_user_id: Mapped[int] = mapped_column(Integer, ForeignKey("Users.id"))
    meter_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("Meters.id"), nullable=False
    )
    observed_property_type_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("ObservedPropertyTypeLU.id"), nullable=False
    )
    unit_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("Units.id"), nullable=False
    )
    location_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("Locations.id"), nullable=False
    )

    submitting_user: Mapped["Users"] = relationship()
    meter: Mapped["Meters"] = relationship()
    observed_property: Mapped["ObservedPropertyTypeLU"] = relationship()
    unit: Mapped["Units"] = relationship()
    location: Mapped["Locations"] = relationship()


class ObservedPropertyTypeLU(Base):
    __tablename__ = "ObservedPropertyTypeLU"
    name: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(String)
    context: Mapped[str] = mapped_column(String)
    units: Mapped[List["Units"]] = relationship(secondary="PropertyUnits")


class Units(Base):
    __tablename__ = "Units"
    name: Mapped[str] = mapped_column(String)
    name_short: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(String)


PropertyUnits = Table(
    "PropertyUnits",
    Base.metadata,
    Column("property_id", ForeignKey("ObservedPropertyTypeLU.id"), nullable=False),
    Column("unit_id", ForeignKey("Units.id"), nullable=False),
)


class meterRegisters(Base):
    __tablename__ = "meter_registers"
    brand: Mapped[str] = mapped_column(String, nullable=False)
    meter_size: Mapped[float] = mapped_column(Float, nullable=False)
    part_id: Mapped[int] = mapped_column(Integer, ForeignKey("Parts.id"))
    ratio: Mapped[str] = mapped_column(String)
    dial_units_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("Units.id"), nullable=False
    )
    totalizer_units_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("Units.id"), nullable=False
    )
    number_of_digits: Mapped[int] = mapped_column(Integer, nullable=False)
    decimal_digits: Mapped[int] = mapped_column(Integer)
    multiplier: Mapped[float] = mapped_column(Float, nullable=False)
    notes: Mapped[str] = mapped_column(String)

    dial_units: Mapped["Units"] = relationship(foreign_keys=[dial_units_id])
    totalizer_units: Mapped["Units"] = relationship(foreign_keys=[totalizer_units_id])
