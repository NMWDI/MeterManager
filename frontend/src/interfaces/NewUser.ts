import type { scope_string } from "./primitives";

export interface NewUser {
  id: number;
  username: string;
  full_name: string;
  email: scope_string;
  disabled: boolean;
  user_role_id: number;
  password: string;
}
