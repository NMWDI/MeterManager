import type { int } from "./primitives";

//This interface is designed to match the backend API patch endpoint
export interface PatchActivitySubmit {
  activity_id: int;
  timestamp_start: string;
  timestamp_end: string;
  description: string;
  submitting_user_id: int;
  meter_id: int;
  activity_type_id: int;
  location_id: int | null;
  ose_share: boolean;
  water_users: string;

  note_ids: int[] | null;
  service_ids: int[] | null;
  part_ids: int[] | null;
}
