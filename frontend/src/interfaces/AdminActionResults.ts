export interface OSEOwnerSyncResult {
  fetched_count: number;
  matched_count: number;
  changed_count: number;
  created_request_count: number;
  notification_count: number;
  unmatched_count: number;
  skipped_pending_count: number;
}

export interface BackupDbResult {
  status: string;
  deleted_old_backups: string[];
}
