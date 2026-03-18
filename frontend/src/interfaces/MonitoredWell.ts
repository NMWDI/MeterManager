import type { WellStatus } from "./WellStatus";

export interface MonitoredWell {
  id: number;
  name: string;
  ra_number: string;
  datastream_id: number;
  well_status: WellStatus;
  outside_recorder?: boolean;
  chloride_group_id?: number;
}
