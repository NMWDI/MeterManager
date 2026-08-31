import type { Location } from "./Location";
import type { MeterRegister } from "./MeterRegister";
import type { MeterStatus } from "./MeterStatus";
import type { MeterType } from "./MeterType";
import type { Well } from "./Well";
import type { MeterContact } from "./MeterContact";

export interface Meter {
  id?: number | null;
  serial_number?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  contacts?: MeterContact[];
  notes?: string | null;
  price?: number | null;

  meter_type_id?: number | null;
  status_id?: number | null;
  well_id?: number | null;
  location_id?: number;

  meter_register?: MeterRegister | null;
  meter_type?: MeterType | null;
  status?: MeterStatus | null;
  well?: Well | null;
  location?: Location | null;
}
