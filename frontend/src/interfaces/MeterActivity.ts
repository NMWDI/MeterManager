import type { int } from "./primitives";
import type { ActivityTypeLU } from "./ActivityTypeLU";
import type { Location } from "./Location";
import type { Meter } from "./Meter";
import type { User } from "./User";

export interface MeterActivity {
  id: int;
  timestamp_start: Date;
  timestamp_end: Date;
  notes?: string;
  submitting_user_id: int;
  meter_id: int;
  meter_status?: string;
  activity_type_id: int;
  location_id: int;

  submitting_user?: User;
  meter?: Meter;
  activity_type?: ActivityTypeLU;
  location?: Location;
  parts_used?: [];
}
