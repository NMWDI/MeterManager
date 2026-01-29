export interface BackupRow {
  id: string; // DataGrid requires an id
  name: string;
  file_size: number;
  format: string;
  gs_uri: string;
  signed_url?: string | null;
  created_utc?: string | null; // ISO string
}
