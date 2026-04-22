export type PartHistoryRow = {
  row_id: string;
  part_id: number;
  event_date: string;
  event_type: "initial" | "added" | "used" | "workorder";
  ref_id?: number | null;
  work_order_id?: number | null;
  note?: string | null;
  delta: number;
  total_after: number;
};

export type EditablePartHistoryRow = {
  ref_id: number;
  event_date: string;
  event_type: "added" | "used" | "workorder";
  note?: string | null;
  delta: number;
};

export type UpdatePartHistoryPayload = {
  rows: EditablePartHistoryRow[];
};

export type PartHistoryResponse = {
  part_id: number;
  part_number: string;
  initial_count: number;
  current_count: number;
  history: PartHistoryRow[];
};
