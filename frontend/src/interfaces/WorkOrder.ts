export interface WorkOrder {
  work_order_id: number;
  date_created: Date;
  creator?: String;
  meter_serial: String;
  title: String;
  description: String;
  status: String;
  notes?: String;
  assigned_user_id?: number;
  assigned_user?: String;
  associated_activities?: number[];
}
