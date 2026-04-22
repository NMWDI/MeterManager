export interface DecreaseQuantityPayload {
  part_id: number | string;
  count: number;
  date: string | undefined;
  note?: string;
}
