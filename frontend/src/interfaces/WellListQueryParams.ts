import type { SortDirection } from "@/enums";

export interface WellListQueryParams {
  search_string?: string;
  // sort_by?: WellSortByField
  sort_direction?: SortDirection;
  limit?: number;
  offset?: number;
  exclude_inactive?: boolean;
}
