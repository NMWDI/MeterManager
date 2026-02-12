// This is designed to match the backend API patch endpoint and is limited to the fields that can be updated
export interface PatchWorkOrder {
  work_order_id: number;
  title?: string;
  description?: string;
  status?: string;
  notes?: string;
  assigned_user_id?: number;
}
