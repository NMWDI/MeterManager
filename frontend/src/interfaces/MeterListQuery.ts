import type { SortDirection } from "@/enums";
import type { MeterListSortBy } from "./MeterListSortBy";

export interface MeterListQuery {
  search_string: string;
  sort_by: MeterListSortBy;
  sort_direction: SortDirection;
  limit: number;
  offset: number;
}
