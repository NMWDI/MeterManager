from typing import List, Optional

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from api.models.base import Base


class WellUseLU(Base):
    __tablename__ = "WellUseLU"
    use_type: Mapped[str] = mapped_column(String, nullable=False)
    code: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(String)


class WaterSources(Base):
    __tablename__ = "water_sources"
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(String)


class WellStatus(Base):
    __tablename__ = "well_status"
    status: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(String)


class Wells(Base):
    __tablename__ = "Wells"

    name: Mapped[str] = mapped_column(String)
    ra_number: Mapped[str] = mapped_column(String)
    owners: Mapped[str] = mapped_column(String)
    osetag: Mapped[str] = mapped_column(String)
    casing: Mapped[str] = mapped_column(String)
    total_depth: Mapped[float] = mapped_column(Float)
    outside_recorder: Mapped[str] = mapped_column(Boolean)

    use_type_id: Mapped[int] = mapped_column(Integer, ForeignKey("WellUseLU.id"))
    location_id: Mapped[int] = mapped_column(Integer, ForeignKey("Locations.id"))
    water_source_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("water_sources.id")
    )
    well_status_id: Mapped[int] = mapped_column(Integer, ForeignKey("well_status.id"))
    chloride_group_id: Mapped[int] = mapped_column(Integer)

    use_type: Mapped["WellUseLU"] = relationship()
    location: Mapped["Locations"] = relationship()
    water_source: Mapped["WaterSources"] = relationship()
    well_status: Mapped["WellStatus"] = relationship()
    meters: Mapped[List["Meters"]] = relationship("Meters", back_populates="well")


class WellMeasurements(Base):
    __tablename__ = "WellMeasurements"

    timestamp: Mapped[DateTime] = mapped_column(
        DateTime, default=func.now(), nullable=False
    )
    value: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    observed_property_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("ObservedPropertyTypeLU.id"), nullable=False
    )
    submitting_user_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("Users.id"), nullable=True
    )
    unit_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("Units.id"), nullable=False
    )
    well_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("Wells.id"), nullable=False
    )

    observed_property: Mapped["ObservedPropertyTypeLU"] = relationship()
    submitting_user: Mapped["Users"] = relationship()
    unit: Mapped["Units"] = relationship()
    well: Mapped["Wells"] = relationship()
