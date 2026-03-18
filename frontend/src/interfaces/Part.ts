import type { MeterTypeLU } from "./MeterTypeLU";
import type { PartTypeLU } from "./PartTypeLU";

export interface Part {
  id: number;
  part_number: string;
  part_type_id: number;
  vendor?: string;
  note?: string;
  description?: string;
  initial_count?: number;
  current_count?: number;
  in_use: boolean;
  commonly_used: boolean;

  part_type?: PartTypeLU;
  meter_types?: MeterTypeLU[];
}
