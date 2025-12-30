import { DeviceAttributes, SensorData } from "./";

export interface DevicePayload {
  deviceAttributes: DeviceAttributes;
  sensorData: SensorData[];
  deviceName: string;
  deviceId: string;
}
