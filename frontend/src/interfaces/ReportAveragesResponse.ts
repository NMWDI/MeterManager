export interface ReportAverageRow {
  period_start: string; // ISO date string
  avg_value: number | null;
}

export type ReportPerWellAverageRow = ReportAverageRow & {
  well_id: number;
  ra_number: string;
};

export interface ReportAveragesResponse {
  bucket: "month" | "year" | null;
  per_well: ReportPerWellAverageRow[];
  all_wells: ReportAverageRow[];
}
