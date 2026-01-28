export interface IncreaseQuantityPayload {
  part_id: number | string;
  count: number;
  date: string | undefined; // YYYY-MM-DD
  note?: string;
}
