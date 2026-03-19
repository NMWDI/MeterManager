export interface UserSessionSummary {
  session_identifier: string;
  device_label?: string | null;
  device_type?: string | null;
  browser?: string | null;
  operating_system?: string | null;
  ip_address?: string | null;
  signed_in_at: string;
  last_seen_at: string;
  signed_out_at?: string | null;
  is_active: boolean;
  sign_out_reason_name?: string | null;
  is_current: boolean;
}

export interface KnownDeviceSummary {
  device_key: string;
  device_label?: string | null;
  device_type?: string | null;
  browser?: string | null;
  operating_system?: string | null;
  session_count: number;
  active_session_count: number;
  signed_in_at_first: string;
  last_seen_at: string;
  is_current_device: boolean;
}

export interface UserSessionsResponse {
  current_session_identifier?: string | null;
  sessions: UserSessionSummary[];
  known_devices: KnownDeviceSummary[];
}
