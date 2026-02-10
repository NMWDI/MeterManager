// The object that gets sent to the backend to add a new measurement
export interface NewWellMeasurement {
  well_id: number;
  timestamp: string;
  value: number;
  submitting_user_id: number;
}
