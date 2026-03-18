import type { float } from "./primitives";
import type { WaterSource } from "./WaterSource";

export interface SubmitWellCreate {
  name: string;
  ra_number: string;
  owners: string;
  osetag: string;
  water_source: WaterSource | null;
  chloride_group_id: number | null;

  use_type: {
    id: number;
  };

  location: {
    name: string;
    trss: string;
    longitude: float;
    latitude: float;
  };
}
