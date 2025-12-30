export interface DeviceAttributes {
  latitude: number;
  longitude: number;
  timeZone: string; // e.g. "America/Denver"
  wellId: string; // e.g. "RA-3502"
  depthToSensor: number; // feet (based on your data)
}
