import type { User } from "./User";

export interface ImpersonationContext {
  impersonator_user_id: number;
  impersonator_full_name?: string | null;
  impersonator_display_name?: string | null;
}

export interface AuthTokenResponse {
  access_token: string;
  token_type: string;
  user: User;
  session_identifier?: string | null;
  impersonation?: ImpersonationContext | null;
}

export interface StoredImpersonationSession {
  actorToken: string;
  actorUser: User;
  actorSessionIdentifier?: string | null;
  impersonatedUser: User;
  impersonatedSessionIdentifier?: string | null;
  startedAt: string;
}
