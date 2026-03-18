import type { float } from "./primitives";
import type { LandOwner } from "./LandOwner";

export interface Location {
  name: string;
  latitude: float;
  longitude: float;
  trss: string;
  land_owner_id: number;

  land_owner?: LandOwner;
}
