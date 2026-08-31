import type { MeterContact } from "./MeterContact";

export interface MeterOwnerChangeRequest {
  id: number;
  meter_id: number;
  serial_number: string;
  ose_meter_id?: number | null;
  old_water_users?: string | null;
  new_water_users?: string | null;
  old_contacts: MeterContact[];
  new_contacts: MeterContact[];
  status: string;
  created_by?: number | null;
  resolved_by?: number | null;
  created_at: string;
  resolved_at?: string | null;
}

export interface MeterOwnerChangeAcceptPayload {
  apply_water_users: boolean;
  apply_contacts: boolean;
}
