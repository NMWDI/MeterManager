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
  last_pm: string;
}
