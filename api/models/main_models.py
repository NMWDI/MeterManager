from sqlalchemy import (
    Column,
    Integer,
    String,
    ForeignKey,
    Float,
    DateTime,
    func,
    Boolean,
    Table,
    Numeric,
)
from sqlalchemy.orm import (
    relationship,
    DeclarativeBase,
    mapped_column,
    Mapped,
    deferred,
)
from geoalchemy2.shape import to_shape
from typing import Optional, List


class Base(DeclarativeBase):
    """
    Base class for all models
    - Adds id column on all tables
    """

    id: Mapped[int] = mapped_column(primary_key=True)
    __name__: str


# ---------- Parts/Services/Notes ------------


class PartTypeLU(Base):
    """
    The types of parts
    """

    __tablename__ = "PartTypeLU"
    name: Mapped[str]
    description: Mapped[str]


# Association table that links meter types and their commonly used parts
# see https://docs.sqlalchemy.org/en/20/orm/basic_relationships.html#many-to-many
PartAssociation = Table(
    "PartAssociation",
    Base.metadata,
    Column("part_id", ForeignKey("Parts.id"), nullable=False),
    Column("meter_type_id", ForeignKey("MeterTypeLU.id"), nullable=False),
)


class Parts(Base):
    """
    All parts
    """

    __tablename__ = "Parts"

    part_number: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    description: Mapped[Optional[str]]
    vendor: Mapped[Optional[str]]
    count: Mapped[int] = mapped_column(Integer, default=0)
    note: Mapped[Optional[str]]
    in_use: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    commonly_used: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    price: Mapped[Optional[float]] = mapped_column(Float)

    part_type_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("PartTypeLU.id"), nullable=False
    )
    part_type: Mapped["PartTypeLU"] = relationship()

    # The meter types associated with this part
    meter_types: Mapped[Optional[List["MeterTypeLU"]]] = relationship(
        secondary=PartAssociation
    )


# Association table that links parts and the meter activity they were used on
PartsUsed = Table(
    "PartsUsed",
    Base.metadata,
    Column("meter_activity_id", ForeignKey("MeterActivities.id"), nullable=False),
    Column("part_id", ForeignKey("Parts.id"), nullable=False),
)


class ServiceTypeLU(Base):
    """
    Describes the type of service performed during an activity
    """

    __tablename__ = "ServiceTypeLU"
    service_name: Mapped[str]
    description: Mapped[str]


# Association table that links meter activities and the services that were performed during
ServicesPerformed = Table(
    "ServicesPerformed",
    Base.metadata,
    Column("meter_activity_id", ForeignKey("MeterActivities.id"), nullable=False),
    Column("service_type_id", ForeignKey("ServiceTypeLU.id"), nullable=False),
)


class NoteTypeLU(Base):
    """
    Pre-defined notes that can be set on activities
    """

    __tablename__ = "NoteTypeLU"
    note: Mapped[str]
    details: Mapped[str]

    # Either one of the special 3 slugs that represent the working status of a meter or null
    # working | not-working | not-checked | null
    slug: Mapped[str]

    # Commonly Used determines what is displayed by default
    commonly_used: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


# Association table that links notes and the meter activity they were added to
Notes = Table(
    "Notes",
    Base.metadata,
    Column("meter_activity_id", ForeignKey("MeterActivities.id"), nullable=False),
    Column("note_type_id", ForeignKey("NoteTypeLU.id"), nullable=False),
)

# ---------  Meter Related Tables ---------


class Meters(Base):
    """
    Primary table for tracking meters
    """

    __tablename__ = "Meters"
    serial_number: Mapped[str] = mapped_column(String, nullable=False)
    # Contact information specific to particular meter
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
    register_id: Mapped[int] = mapped_column(Integer, ForeignKey("meter_registers.id"), nullable=True)

    water_users: Mapped[Optional[str]] = mapped_column(String)
    meter_owner: Mapped[Optional[str]] = mapped_column(String)

    meter_type: Mapped["MeterTypeLU"] = relationship()
    meter_register: Mapped["meterRegisters"] = relationship()
    status: Mapped["MeterStatusLU"] = relationship()
    well: Mapped["Wells"] = relationship("Wells", back_populates="meters")
    location: Mapped["Locations"] = relationship()



class MeterTypeLU(Base):
    """
    Meter types
    """

    __tablename__ = "MeterTypeLU"
    brand: Mapped[str] = mapped_column(String)
    series: Mapped[str] = mapped_column(String)
    model: Mapped[str] = mapped_column(String)
    size: Mapped[float] = mapped_column(Float)
    description: Mapped[str] = mapped_column(String)
    in_use: Mapped[bool] = mapped_column(Boolean, nullable=False)

    # parts: Mapped[List["Parts"]] = relationship(secondary=PartAssociation)


class MeterStatusLU(Base):
    """
    Establishes if a meter is installed, in inventory, retired, or other options as needed.
    """

    __tablename__ = "MeterStatusLU"
    status_name: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(String)


class MeterActivities(Base):
    """
    Logs all meter activities
    """

    __tablename__ = "MeterActivities"
    timestamp_start: Mapped[DateTime] = mapped_column(DateTime, nullable=False)
    timestamp_end: Mapped[DateTime] = mapped_column(DateTime, nullable=False)
    description: Mapped[DateTime] = mapped_column(String)

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

    parts_used: Mapped[List["Parts"]] = relationship("Parts", secondary=PartsUsed)
    services_performed: Mapped[List["ServiceTypeLU"]] = relationship(
        "ServiceTypeLU", secondary=ServicesPerformed
    )
    notes: Mapped[List["NoteTypeLU"]] = relationship("NoteTypeLU", secondary=Notes)
    work_order: Mapped["workOrders"] = relationship()
    well: Mapped["Wells"] = relationship("Wells", primaryjoin='MeterActivities.location_id == Wells.location_id', foreign_keys='MeterActivities.location_id', viewonly=True)
    photos: Mapped[List["MeterActivityPhotos"]]  = relationship("MeterActivityPhotos", back_populates="meter_activity", cascade="all, delete")


class MeterActivityPhotos(Base):
    __tablename__ = "MeterActivityPhotos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    meter_activity_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("MeterActivities.id", ondelete="CASCADE"), nullable=False
    )
    file_name: Mapped[str] = mapped_column(String, nullable=False)
    gcs_path: Mapped[str] = mapped_column(String, nullable=False)
    uploaded_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    meter_activity: Mapped["MeterActivities"] = relationship(
        "MeterActivities", back_populates="photos"
    )


class ActivityTypeLU(Base):
    """
    Details the different types of activities PVACD implements
    """

    __tablename__ = "ActivityTypeLU"
    name: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(String)

    # Specifies who can perform this activity (must be either 'technician' or 'admin')
    # If admin, only admins can perform, if technician then technician or admin can perform
    permission: Mapped[str] = mapped_column(String)


class MeterObservations(Base):
    """
    Tracks all observations associated with a meter
    """

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
    """
    Defines the types of observations made on a meter
    """

    __tablename__ = "ObservedPropertyTypeLU"
    name: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(String)
    context: Mapped[str] = mapped_column(
        String
    )  # Specifies if property associated with 'meter' or 'well'

    # The units that can be used on this property type
    units: Mapped[List["Units"]] = relationship(secondary="PropertyUnits")


class Units(Base):
    """
    Defines units used in observations
    """

    __tablename__ = "Units"
    name: Mapped[str] = mapped_column(String)
    name_short: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(String)


# Association table that links observed property types and their appropriate units
PropertyUnits = Table(
    "PropertyUnits",
    Base.metadata,
    Column("property_id", ForeignKey("ObservedPropertyTypeLU.id"), nullable=False),
    Column("unit_id", ForeignKey("Units.id"), nullable=False),
)

# ---------- Other Tables ---------------


class Locations(Base):
    """
    Table for tracking information about a well's location
    """

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
    # geom = mapped_column(Geometry("POINT")) # SQLAlchemy/FastAPI has some issue sending this

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
    """
    Defines the type of location, such as well
    """

    __tablename__ = "LocationTypeLU"
    type_name: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(String)


class LandOwners(Base):
    """
    Organizations and people that have some relationship with a PVACD meter
    - Typically irrigators?
    """

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


# -----------    Security Tables    ---------------


class Users(Base):
    """
    All info about a user of the app
    """

    __tablename__ = "Users"

    full_name: Mapped[str] = mapped_column(String)
    disabled: Mapped[bool] = mapped_column(Boolean, default=False)
    username: Mapped[str] = deferred(
        mapped_column(String, nullable=False)
    )  # Defer sensitive info so it's not sent when it's included as part of a relationship
    email: Mapped[str] = deferred(mapped_column(String))
    hashed_password: Mapped[str] = deferred(mapped_column(String, nullable=False))

    user_role_id: Mapped[int] = deferred(
        mapped_column(Integer, ForeignKey("UserRoles.id"), nullable=False)
    )

    user_role: Mapped["UserRoles"] = relationship("UserRoles")
    display_name: Mapped[str] = mapped_column(String, nullable=True)
    redirect_page: Mapped[str] = mapped_column(String, nullable=True, default="/")
    avatar_img: Mapped[str] = mapped_column(String, nullable=True)


# Association table that links roles and their associated scopes
ScopesRoles = Table(
    "ScopesRoles",
    Base.metadata,
    Column("security_scope_id", ForeignKey("SecurityScopes.id"), nullable=False),
    Column("user_role_id", ForeignKey("UserRoles.id"), nullable=False),
)


class SecurityScopes(Base):
    """
    Individual permissions
    """

    __tablename__ = "SecurityScopes"
    scope_string: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(String)


class UserRoles(Base):
    __tablename__ = "UserRoles"
    name: Mapped[str] = mapped_column(String, nullable=False)

    # The scopes associated with a given role
    security_scopes: Mapped[List["SecurityScopes"]] = relationship(
        secondary=ScopesRoles
    )


# ------------ Wells --------------


class WellUseLU(Base):
    """
    The type of well
    """

    __tablename__ = "WellUseLU"
    use_type: Mapped[str] = mapped_column(String, nullable=False)
    code: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(String)

class WaterSources(Base):
    """
    The source of water for a well
    """

    __tablename__ = "water_sources"
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(String)

class WellStatus(Base):
    """
    The status of a well
    """

    __tablename__ = "well_status"
    status: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(String)


class Wells(Base):
    """
    All wells
    """

    __tablename__ = "Wells"
    name: Mapped[str] = mapped_column(String)
    ra_number: Mapped[str] = mapped_column(
        String
    )  # RA Number is an OSE well identifier
    owners: Mapped[str] = mapped_column(String)
    osetag: Mapped[str] = mapped_column(String)
    casing: Mapped[str] = mapped_column(String)
    total_depth: Mapped[float] = mapped_column(Float)
    outside_recorder: Mapped[str] = mapped_column(Boolean)

    use_type_id: Mapped[int] = mapped_column(Integer, ForeignKey("WellUseLU.id"))
    location_id: Mapped[int] = mapped_column(Integer, ForeignKey("Locations.id"))
    water_source_id: Mapped[int] = mapped_column(Integer, ForeignKey("water_sources.id"))
    well_status_id: Mapped[int] = mapped_column(Integer, ForeignKey("well_status.id"))
    chloride_group_id: Mapped[int] = mapped_column(Integer)

    use_type: Mapped["WellUseLU"] = relationship()
    location: Mapped["Locations"] = relationship()
    water_source: Mapped["WaterSources"] = relationship()
    well_status: Mapped["WellStatus"] = relationship()

    meters: Mapped[List["Meters"]] = relationship("Meters", back_populates="well")


class WellMeasurements(Base):
    """
    The measurements made on a monitored well
    """

    __tablename__ = "WellMeasurements"
    timestamp: Mapped[DateTime] = mapped_column(
        DateTime, default=func.now(), nullable=False
    )
    value: Mapped[float] = mapped_column(Float, nullable=False)

    observed_property_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("ObservedPropertyTypeLU.id"), nullable=False
    )
    submitting_user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("Users.id"), nullable=False
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


class workOrderStatusLU(Base):
    '''
    Models the status of a work order
    '''
    __tablename__ = "work_order_status_lu"
    name = mapped_column(String, nullable=False)
    description = mapped_column(String, nullable=False)

class workOrders(Base):
    '''
    Models work orders and associated information
    '''
    __tablename__ = "work_orders"
    date_created: Mapped[DateTime] = mapped_column(DateTime, nullable=False)
    creator: Mapped[str] = mapped_column(String, nullable=True) # There is no consistent list of persons for this, so it is nullable
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(String, nullable=True)
    meter_id: Mapped[int] = mapped_column(Integer, ForeignKey("Meters.id"), nullable=False)
    status_id: Mapped[int] = mapped_column(Integer, ForeignKey("work_order_status_lu.id"), nullable=False)
    notes: Mapped[str] = mapped_column(String, nullable=True)
    assigned_user_id: Mapped[int] = mapped_column(Integer, ForeignKey("Users.id"), nullable=True)
    ose_request_id: Mapped[int] = mapped_column(Integer, nullable=True)

    # Associated Activities
    # associated_activities: Mapped[List['MeterActivities']] = relationship("MeterActivities")

    meter: Mapped['Meters']= relationship()
    status: Mapped['workOrderStatusLU']= relationship()
    assigned_user: Mapped['Users'] = relationship()

class meterRegisters(Base):
    '''
    Models the registers of a meter
    '''
    __tablename__ = "meter_registers"
    brand: Mapped[str] = mapped_column(String, nullable=False)
    meter_size: Mapped[float] = mapped_column(Float, nullable=False)
    part_id: Mapped[int] = mapped_column(Integer, ForeignKey("Parts.id"))
    ratio: Mapped[str] = mapped_column(String)
    dial_units_id: Mapped[int] = mapped_column(Integer, ForeignKey("Units.id"), nullable=False)
    totalizer_units_id: Mapped[int] = mapped_column(Integer, ForeignKey("Units.id"), nullable=False)
    number_of_digits: Mapped[int] = mapped_column(Integer, nullable=False)
    decimal_digits: Mapped[int] = mapped_column(Integer)
    multiplier: Mapped[float] = mapped_column(Float, nullable=False)
    notes: Mapped[str] = mapped_column(String)

    dial_units: Mapped['Units'] = relationship(foreign_keys=[dial_units_id])
    totalizer_units: Mapped['Units'] = relationship(foreign_keys=[totalizer_units_id])


