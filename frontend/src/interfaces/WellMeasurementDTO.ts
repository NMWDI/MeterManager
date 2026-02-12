// Single manual measurement from a certain well
export interface WellMeasurementDTO {
  id: number;
  timestamp: Date;
  value: number;
  submitting_user: { full_name: string };
  well: { id: number; ra_number: string };
}
