import type { float, int } from "./primitives";

export interface MeterType {
  id?: int;
  brand?: string;
  series?: string;
  model?: string;
  size?: float;
  description?: string;
}
