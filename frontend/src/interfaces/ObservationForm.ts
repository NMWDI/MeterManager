import type { Dayjs } from "dayjs";

export interface ObservationForm {
  time: Dayjs;
  reading: "" | number;
  property_type_id: "" | number;
  unit_id: "" | number;
}
