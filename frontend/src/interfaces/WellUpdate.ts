import type { BaseWell } from "./BaseWell";
import type { Location } from "./Location";
import type { WaterSource } from "./WaterSource";
import type { WellStatus } from "./WellStatus";
import type { WellUseLU } from "./WellUseLU";

export interface WellUpdate extends BaseWell {
  use_type: WellUseLU;
  water_source: WaterSource;
  location: Location;
  well_status: WellStatus;
}
