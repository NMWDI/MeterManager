export interface IncreaseQuantityPayload {
  partId: number | string;
  increaseBy: number;
  date: string; // YYYY-MM-DD
}
