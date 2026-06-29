import type { scope_string } from "./primitives";
import type { UserRole } from "./UserRole";

export interface User {
  id: number;
  username?: string;
  full_name: string;
  display_name?: string;
  email?: scope_string;
  disabled: boolean;
  user_role_id?: number;
  user_role?: UserRole;
  redirect_page?: string;
  avatar_img?: string | null;
  password?: string;
  password_changed_at?: string | null;
  password_strength_score?: number | null;
  password_strength_label?: string | null;
  password_policy_compliant?: boolean | null;
  password_compromised_checked_at?: string | null;
  password_compromised_count?: number | null;
}
