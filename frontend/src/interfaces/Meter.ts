import type { Location } from "./Location";
import type { MeterRegister } from "./MeterRegister";
import type { MeterStatus } from "./MeterStatus";
import type { MeterType } from "./MeterType";
import type { Well } from "./Well";

export interface Meter {
  id: number;
  serial_number: string;
  contact_name?: string;
  contact_phone?: string;
  notes?: string;
  price?: number;

  meter_type_id: number;
  status_id?: number;
  well_id: number;
  location_id?: number;

  meter_register?: MeterRegister;
  meter_type?: MeterType;
  status?: MeterStatus;
  well?: Well;
  location?: Location;
}
