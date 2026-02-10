export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}
