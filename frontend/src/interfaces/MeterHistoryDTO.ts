import type { int } from "./primitives";
import type { Location } from "./Location";
import type { Well } from "./Well";

export interface MeterHistoryDTO {
  id: int;
  history_type: string;
  activity_type: string;
  date: Date;
  history_item: any;
  location: Location;
  well: Well | null;
  photos: any;
}
