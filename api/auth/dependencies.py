from enum import Enum

from api.security import scoped_user


class ScopedUser(Enum):
    Read = scoped_user(["read"])
    Admin = scoped_user(["admin"])
    OSE = scoped_user(["ose"])
    ActivityWrite = scoped_user(["activities:write"])
    WellMeasurementWrite = scoped_user(["well_measurement:write"])
    MeterWrite = scoped_user(["meters:write"])
    WellWrite = scoped_user(["well:write"])
