export interface NewRegionMeasurement {
  region_id: number;
  timestamp: string;
  value: number | null;
  submitting_user_id: number;
  well_id: number;
}
