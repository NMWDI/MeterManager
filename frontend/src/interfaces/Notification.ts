import { NotificationType } from "./NotificationType";

export interface Notification {
  id: number;
  user_id: number;
  notification_type_id: number;
  title: string;
  message: string;
  link?: string | null;
  is_read: boolean;
  created_at: string;
  read_at?: string | null;
  notification_type: NotificationType;
}
