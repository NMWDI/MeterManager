import type { WellStatus } from "./WellStatus";

export interface MonitoredRegion {
  id: number;
  name: string;
  datastream_id: number;
  well_status: WellStatus;
  outside_recorder?: boolean;
}
