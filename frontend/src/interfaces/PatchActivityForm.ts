import type { Dayjs } from "dayjs";
import type { int } from "./primitives";
import type { ActivityTypeLU } from "./ActivityTypeLU";
import type { NoteTypeLU } from "./NoteTypeLU";
import type { Part } from "./Part";
import type { ServiceTypeLU } from "./ServiceTypeLU";
import type { User } from "./User";
import type { Well } from "./Well";

//This is designed to match the HistoryDetails form rather than the patch meter API
export interface PatchActivityForm {
  activity_id: int;
  meter_id: int;
  activity_date: Dayjs;
  activity_start_time: Dayjs;
  activity_end_time: Dayjs;
  activity_type: ActivityTypeLU;
  submitting_user: User;
  description: string;

  well: Well | null;
  water_users?: string;

  notes?: NoteTypeLU[];
  services?: ServiceTypeLU[];
  parts_used?: Part[];

  ose_share: boolean;
}
