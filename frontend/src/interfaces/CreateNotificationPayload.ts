export interface CreateNotificationPayload {
  role_ids: number[];
  user_ids: number[];
  notification_type_id: number;
  title: string;
  message: string;
  link?: string;
}
