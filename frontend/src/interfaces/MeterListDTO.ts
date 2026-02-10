export interface MeterListDTO {
  id: number;
  serial_number: string;
  status?: { status_name?: string };
  water_users: string;
  location: {
    trss: string;
    longitude: number;
    latitude: number;
  };
  well: {
    ra_number: string;
    name: string;
    owners: string;
  };
}
