import type { float, int } from "./primitives";
import type { MeterRegister } from "./MeterRegister";
import type { MeterStatus } from "./MeterStatus";
import type { MeterType } from "./MeterType";
import type { Well } from "./Well";
import type { MeterContact } from "./MeterContact";

export interface MeterDetails {
  id?: number | null;
  serial_number?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  contacts?: MeterContact[];
  water_users?: string | null;
  meter_owner?: string | null;
  ra_number?: string | null;
  tag?: string | null;
  well_distance_ft?: float | null;
  notes?: string | null;
  meter_type_id?: int | null;
  well_id?: int | null;

  meter_type: MeterType;
  status: MeterStatus;
  well: Well | null;
  meter_register: MeterRegister | null;
  // Also has parts_associated?: List[Part]
}
