import type { Dayjs } from "dayjs";
import type { ObservationForm } from "./ObservationForm";

export interface ActivityForm {
  activity_details?: {
    meter_id?: number;
    activity_type_id?: number;
    user_id?: number;
    date?: Dayjs;
    start_time?: Dayjs;
    end_time?: Dayjs;
    share_ose: boolean;
    work_order_id?: number;
  };

  current_installation?: {
    contact_name?: string;
    contact_phone?: string;
    well_id?: number;
    notes?: string;
    water_users?: string;
    meter_owner?: string;
  };

  observations?: ObservationForm[];

  maintenance_repair?: {
    service_type_ids: number[];
    description: string;
  };

  notes?: {
    working_on_arrival_slug: string;
    selected_note_ids: number[];
  };

  part_used_ids?: number[];
}
