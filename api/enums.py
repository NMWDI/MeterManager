from enum import Enum


class MeterSortByField(Enum):
    SerialNumber = "serial_number"
    RANumber = "ra_number"
    WaterUsers = "water_users"
    TRSS = "trss"
    MeterSize = "meter_size"


class WellSortByField(Enum):
    Name = "name"
    RANumber = "ra_number"
    OSETag = "osetag"
    UseType = "use_type"
    Location = "location"

class MeterStatus(Enum):
    #Status can be: Installed, Warehouse, Scrapped, Returned, Sold, or Unknown
    Installed = "Installed"
    Warehouse = "Warehouse"
    Scrapped = "Scrapped"
    Returned = "Returned"
    Sold = "Sold"
    Unknown = "Unknown"
    OnHold = "On Hold"

class SortDirection(Enum):
    Ascending = "asc"
    Descending = "desc"


class WorkOrderStatus(Enum):
    Open = "Open"
    Closed = "Closed"
    Review = "Review"
