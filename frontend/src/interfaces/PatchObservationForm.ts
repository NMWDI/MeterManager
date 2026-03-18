import type { Dayjs } from "dayjs";
import type { int } from "./primitives";
import type { ObservedPropertyTypeLU } from "./ObservedPropertyTypeLU";
import type { Unit } from "./Unit";
import type { User } from "./User";
import type { Well } from "./Well";

//Designed for the HistoryDetails component, not the patch endpoint
export interface PatchObservationForm {
  observation_id: int;
  submitting_user: User;
  well: Well | null;
  observation_date: Dayjs;
  observation_time: Dayjs;
  property_type: ObservedPropertyTypeLU;
  unit: Unit;
  value: number;
  ose_share: boolean;
  notes?: string;
  meter_id: int;
}
