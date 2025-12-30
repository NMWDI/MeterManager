import { SensorAttributes, Measurement } from "./";

export interface SensorData {
  sensorId: string; // UUID
  sensorName: string; // e.g. "Water Column Height"
  attributes: SensorAttributes;
  measurements: Measurement[];
}
