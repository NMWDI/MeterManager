import type { Unit } from "./Unit";

export interface MeterRegister {
  id: number;
  brand: string;
  meter_size: number;
  ratio: string | null;
  number_of_digits: number | null;
  decimal_digits: number | null;
  dial_units: Unit;
  totalizer_units: Unit;
  multiplier?: number | null;
}
