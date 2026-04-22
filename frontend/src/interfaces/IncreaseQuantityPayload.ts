export interface IncreaseQuantityPayload {
  part_id: number | string;
  count: number;
  date: string | undefined;
  note?: string;
}
