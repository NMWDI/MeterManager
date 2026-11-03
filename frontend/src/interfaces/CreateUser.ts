import type { scope_string } from "./primitives";

export interface CreateUser {
  username: string;
  full_name: string;
  email: scope_string;
  disabled: boolean;
  is_test_account: boolean;
  user_role: { id: number };
  password: string;
}
