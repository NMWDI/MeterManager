export interface IncreaseQuantityPayload {
  partId: number | string;
  increaseBy: number;
  date: string | undefined; // YYYY-MM-DD
}
