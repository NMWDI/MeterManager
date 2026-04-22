import { useSnackbar } from "notistack";
import {
  useMutation,
  useQuery,
  useQueryClient,
  UseQueryOptions,
} from "react-query";
import { useApiClient } from "@/hooks";
import { NewWorkOrder, PatchWorkOrder, WorkOrder } from "@/interfaces";
import { WorkOrderStatus } from "@/enums";

export function useGetWorkOrders(
  params: {
    filter_by_status: WorkOrderStatus[];
    start_date?: string;
    work_order_id?: number[];
    assigned_user_id?: number;
    q?: string;
  },
  options?: UseQueryOptions<WorkOrder[], Error>,
) {
  const apiClient = useApiClient();
  const route = "work_orders";

  const normalized = {
    ...params,
    filter_by_status: [...(params.filter_by_status ?? [])].sort(),
    work_order_id: params.work_order_id
      ? [...params.work_order_id].sort((a, b) => a - b)
      : undefined,
    q: params.q?.trim() || undefined,
  };

  return useQuery<WorkOrder[], Error>({
    queryKey: [route, normalized],
    queryFn: () => apiClient.get(route, normalized),
    ...options,
  });
}

export function useUpdateWorkOrder() {
  const { enqueueSnackbar } = useSnackbar();
  const apiClient = useApiClient();
  const route = "work_orders";

  return useMutation({
    mutationFn: async (workOrder: PatchWorkOrder) => {
      const response = await apiClient.patch(route, workOrder);

      if (!response.ok) {
        if (response.status == 409) {
          enqueueSnackbar("Title must be unique for date and meter", {
            variant: "error",
          });
          throw Error(
            "Failure of date, meter, and title uniqueness constraint",
          );
        }
        if (response.status == 422) {
          enqueueSnackbar("Title cannot be blank", { variant: "error" });
          throw Error("Title is empty string");
        } else {
          enqueueSnackbar("Unknown Error Occurred!", { variant: "error" });
          throw Error("Unknown Error: " + response.status);
        }
      } else {
        const responseJson = await response.json();
        return responseJson;
      }
    },
    retry: 0,
  });
}

export function useDeleteWorkOrder(onSuccess: Function) {
  const { enqueueSnackbar } = useSnackbar();
  const apiClient = useApiClient();

  return useMutation({
    mutationFn: async (workOrderID: number) => {
      const response = await apiClient.delete("work_orders", {
        work_order_id: workOrderID,
      });

      if (!response.ok) {
        enqueueSnackbar("Unknown Error Occurred!", { variant: "error" });
        throw Error("Unknown Error: " + response.status);
      } else {
        onSuccess();
        return true;
      }
    },
    retry: 0,
  });
}

export function useCreateWorkOrder() {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const apiClient = useApiClient();
  const route = "work_orders";

  return useMutation({
    mutationFn: async (workOrder: NewWorkOrder) => {
      const response = await apiClient.post(route, workOrder);

      if (!response.ok) {
        if (response.status == 409) {
          enqueueSnackbar("Title must be unique for date and meter", {
            variant: "error",
          });
          throw Error(
            "Failure of date, meter, and title uniqueness constraint",
          );
        }
        if (response.status == 422) {
          enqueueSnackbar("Title cannot be blank", { variant: "error" });
          throw Error("Title is empty string");
        } else {
          enqueueSnackbar("Unknown Error Occurred!", { variant: "error" });
          throw Error("Unknown Error: " + response.status);
        }
      } else {
        queryClient.invalidateQueries({
          queryKey: [route],
        });

        const responseJson = await response.json();
        return responseJson;
      }
    },
    retry: 0,
  });
}
