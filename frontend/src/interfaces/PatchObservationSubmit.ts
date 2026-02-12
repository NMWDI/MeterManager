import type { int } from "./primitives";

export interface PatchObservationSubmit {
  //Matches the backend API patch endpoint
  observation_id: int;
  timestamp: string;
  value: number;
  notes: string | null;
  submitting_user_id: int;
  meter_id: int;
  observed_property_type_id: int;
  unit_id: int;
  location_id: int | null;
  ose_share: boolean;
}
