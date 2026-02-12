import type { Dayjs } from "dayjs";

export interface PatchRegionMeasurement {
  levelmeasurement_id: number;
  submitting_user_id: number;
  well_id: number;
  timestamp: Dayjs;
  value?: number | null;
}
