from datetime import date
from typing import List, Optional

from sqlalchemy import Boolean, Column, Date, Float, ForeignKey, Integer, String, Table
from sqlalchemy.orm import Mapped, mapped_column, relationship

from api.models.base import Base


class PartTypeLU(Base):
    __tablename__ = "PartTypeLU"
    name: Mapped[str]
    description: Mapped[str]


PartAssociation = Table(
    "PartAssociation",
    Base.metadata,
    Column("part_id", ForeignKey("Parts.id"), nullable=False),
    Column("meter_type_id", ForeignKey("MeterTypeLU.id"), nullable=False),
)


class Parts(Base):
    __tablename__ = "Parts"

    part_number: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    description: Mapped[Optional[str]]
    vendor: Mapped[Optional[str]]
    initial_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    note: Mapped[Optional[str]]
    in_use: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    commonly_used: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    price: Mapped[Optional[float]] = mapped_column(Float)

    part_type_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("PartTypeLU.id"), nullable=False
    )
    part_type: Mapped["PartTypeLU"] = relationship()
    meter_types: Mapped[Optional[List["MeterTypeLU"]]] = relationship(
        secondary=PartAssociation
    )
    parts_used_links: Mapped[list["PartsUsed"]] = relationship(
        back_populates="part",
        cascade="all, delete-orphan",
    )


class PartsUsed(Base):
    __tablename__ = "PartsUsed"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    meter_activity_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("MeterActivities.id"), nullable=True
    )
    part_id: Mapped[int] = mapped_column(ForeignKey("Parts.id"), nullable=False)
    count: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    note: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    part: Mapped["Parts"] = relationship(back_populates="parts_used_links")
    meter_activity: Mapped[Optional["MeterActivities"]] = relationship(
        back_populates="parts_used_links"
    )


class PartsAdded(Base):
    __tablename__ = "PartsAdded"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    part_id: Mapped[int] = mapped_column(ForeignKey("Parts.id"), nullable=False)
    count: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    note: Mapped[str | None] = mapped_column(String, nullable=True)

    part: Mapped["Parts"] = relationship()
