import type { int } from "./primitives";
import type { Part } from "./Part";

export interface PartAssociation {
  id: int;
  meter_type_id: int;
  part_id: int;
  commonly_used: boolean;
  part?: Part;
}
