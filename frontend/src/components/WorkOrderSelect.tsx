/*
A simple select component that limits options based on filters.
*/

import { useEffect, useState } from "react";
import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import { useGetWorkOrders } from "@/service";
import { WorkOrderStatus } from "@/enums";
import { WorkOrder } from "@/interfaces";

interface WorkOrderSelectFilters {
  meter_serial?: string;
  assigned_user_id?: number;
  date_created?: Date;
}

interface WorkOrderSelectProps {
  selectedWorkOrderID: number | null;
  setSelectedWorkOrderID: (workOrderID: number | null) => void;
  option_filters?: WorkOrderSelectFilters;
}

function optionsFilter(
  workOrders: WorkOrder[],
  filters: WorkOrderSelectFilters,
) {
  //Use the filter method for each component of the filter
  if (filters.meter_serial && filters.meter_serial !== undefined) {
    workOrders = workOrders.filter(
      (workOrder) => workOrder.meter_serial === filters.meter_serial,
    );
  }
  if (filters.assigned_user_id && filters.assigned_user_id !== undefined) {
    workOrders = workOrders.filter(
      (workOrder) => workOrder.assigned_user_id === filters.assigned_user_id,
    );
  }
  if (filters.date_created && filters.date_created !== undefined) {
    workOrders = workOrders.filter(
      (workOrder) => workOrder.date_created === filters.date_created,
    );
  }
  return workOrders;
}

export default function WorkOrderSelect({
  selectedWorkOrderID,
  setSelectedWorkOrderID,
  option_filters,
}: WorkOrderSelectProps) {
  const workOrderList = useGetWorkOrders([WorkOrderStatus["Open"]]);
  const [filteredWorkOrders, setFilteredWorkOrders] = useState<WorkOrder[]>([]);

  useEffect(() => {
    if (workOrderList.data) {
      setFilteredWorkOrders(
        optionsFilter(workOrderList.data, option_filters ?? {}),
      );
    }
  }, [workOrderList, option_filters]);

  return (
    <FormControl size="small" fullWidth>
      <InputLabel>Work Order</InputLabel>
      <Select
        value={selectedWorkOrderID ?? ""}
        label="Work Order"
        onChange={(event: any) => setSelectedWorkOrderID(event.target.value)}
      >
        <MenuItem value="">None</MenuItem>
        {filteredWorkOrders.map((workOrder: WorkOrder) => {
          return (
            <MenuItem
              key={workOrder.work_order_id}
              value={workOrder.work_order_id}
            >
              {workOrder.title}
            </MenuItem>
          );
        })}
      </Select>
    </FormControl>
  );
}
