export interface RegionMeasurementDTO {
  id: number;
  timestamp: Date;
  value: number;
  submitting_user: { id: number; full_name: string };
  well: { id: number; ra_number: string };
}
