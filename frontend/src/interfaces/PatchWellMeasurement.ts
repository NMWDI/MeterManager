import type { Dayjs } from "dayjs";

export interface PatchWellMeasurement {
  levelmeasurement_id: number;
  submitting_user_id: number;
  timestamp: Dayjs;
  value: number;
}
