from sqlalchemy import Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from geoalchemy2.shape import to_shape

from api.models.base import Base


class Locations(Base):
    __tablename__ = "Locations"

    name: Mapped[str] = mapped_column(String)
    trss: Mapped[str] = mapped_column(String)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    township: Mapped[int] = mapped_column(Integer)
    range: Mapped[int] = mapped_column(Integer)
    section: Mapped[int] = mapped_column(Integer)
    quarter: Mapped[int] = mapped_column(Integer)
    half_quarter: Mapped[int] = mapped_column(Integer)
    quarter_quarter: Mapped[int] = mapped_column(Integer)

    type_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("LocationTypeLU.id"), nullable=False
    )
    land_owner_id: Mapped[int] = mapped_column(Integer, ForeignKey("LandOwners.id"))

    land_owner: Mapped["LandOwners"] = relationship()
    type: Mapped["LocationTypeLU"] = relationship()

    @property
    def lat(self):
        try:
            return to_shape(self.geom).y
        except BaseException:
            return

    @property
    def long(self):
        try:
            return to_shape(self.geom).x
        except BaseException:
            return

    @property
    def location(self):
        return f"{self.township}.{self.range}.{self.section}.{self.quarter}.{self.half_quarter}"


class LocationTypeLU(Base):
    __tablename__ = "LocationTypeLU"
    type_name: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(String)


class LandOwners(Base):
    __tablename__ = "LandOwners"
    contact_name: Mapped[str] = mapped_column(String)
    organization: Mapped[str] = mapped_column(String)
    address: Mapped[str] = mapped_column(String)
    city: Mapped[str] = mapped_column(String)
    state: Mapped[str] = mapped_column(String)
    zip: Mapped[str] = mapped_column(String)
    phone: Mapped[str] = mapped_column(String)
    mobile: Mapped[str] = mapped_column(String)
    email: Mapped[str] = mapped_column(String)
    note: Mapped[str] = mapped_column(String)
