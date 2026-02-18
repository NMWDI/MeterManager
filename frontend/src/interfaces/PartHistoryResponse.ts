export type PartHistoryRow = {
  id: string;
  part_id: number;
  event_date: string;
  event_type: "initial" | "added" | "used";
  ref_id?: number | null;
  note?: string | null;
  delta: number;
  total_after: number;
};

export type PartHistoryResponse = {
  part_id: number;
  part_number: string;
  initial_count: number;
  history: PartHistoryRow[];
};
