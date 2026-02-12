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
  password?: string;
}
