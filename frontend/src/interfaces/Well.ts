import type { int } from "./primitives";
import type { BaseWell } from "./BaseWell";
import type { Location } from "./Location";
import type { WaterSource } from "./WaterSource";
import type { WellStatus } from "./WellStatus";
import type { WellUseLU } from "./WellUseLU";

export interface Well extends BaseWell {
  use_type: WellUseLU | null;
  water_source: WaterSource | null;
  location: Location | null;
  well_status: WellStatus | null;

  meters: [
    {
      id: int;
      serial_number: string;
      water_users?: string;
    }
  ];
}
