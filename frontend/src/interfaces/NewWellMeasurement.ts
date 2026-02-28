export interface NewWellMeasurement {
  well_id: number;
  timestamp: string;
  value: number | null;
  submitting_user_id: number;
}
