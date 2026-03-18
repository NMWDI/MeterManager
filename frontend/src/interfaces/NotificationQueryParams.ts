export interface NotificationQueryParams {
  q?: string;
  is_read?: boolean;
  notification_type_id?: number[];
  created_from?: string;
  created_to?: string;
  limit?: number;
  offset?: number;
}
