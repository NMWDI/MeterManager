import type { MeterSortByField, MeterStatusNames, SortDirection } from "@/enums";

export interface MeterListQueryParams {
  search_string?: string;
  filter_by_status?: MeterStatusNames[];
  sort_by?: MeterSortByField;
  sort_direction?: SortDirection;
  limit?: number;
  offset?: number;
}
