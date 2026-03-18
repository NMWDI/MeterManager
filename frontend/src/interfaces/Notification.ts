import { NotificationType } from "./NotificationType";
import { User } from "./User";

export interface Notification {
  id: number;
  user_id: number;
  notification_type_id: number;
  created_by?: number | null;
  title: string;
  message: string;
  link?: string | null;
  is_read: boolean;
  created_at: string;
  read_at?: string | null;
  notification_type: NotificationType;
  creator?: User | null;
}
