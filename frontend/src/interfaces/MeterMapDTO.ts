export interface MeterMapDTO {
  id: number;
  serial_number: string;
  well: {
    ra_number: string;
    name: string;
  };
  location: {
    longitude: number;
    latitude: number;
  };
  last_pm_meter_activity: string | null;
  last_location_only_meter_activity: string | null;
}
