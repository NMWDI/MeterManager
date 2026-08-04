import type { User } from "./User";

export interface ServiceAccountApiKey {
  id?: number;
  key_identifier: string;
  key_prefix: string;
  created_at: string;
  last_used_at?: string | null;
  revoked_at?: string | null;
}

export interface ServiceAccount extends User {
  is_service_account: boolean;
  api_keys: ServiceAccountApiKey[];
  api_key?: string;
}

export interface ServiceAccountForm {
  id?: number;
  username?: string;
  full_name: string;
  display_name?: string | null;
  disabled: boolean;
  user_role_id?: number;
  user_role?: ServiceAccount["user_role"];
}
