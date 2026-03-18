export interface BaseWell {
  id: number;
  name: string;
  ra_number: string;
  owners: string;
  osetag: string;
  casing: string;
  total_depth: number;
  outside_recorder: boolean;
  location_id: number;
  use_type_id: number;
  well_status_id: number;
  water_source_id: number;
  chloride_group_id: number | null;
}
