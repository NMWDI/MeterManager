import { useSnackbar } from "notistack";
import { useMutation, useQuery, useQueryClient, UseQueryOptions } from "react-query";
import { useApiClient } from "@/hooks";
import {
  CreateNotificationPayload,
  Notification,
  NotificationCreateResult,
  NotificationQueryParams,
  NotificationType,
  Page,
} from "@/interfaces";

export function useGetNotifications(
  params: NotificationQueryParams | undefined,
  options?: UseQueryOptions<Page<Notification>, Error>,
) {
  const apiClient = useApiClient();
  const route = "notifications";

  return useQuery<Page<Notification>, Error>(
    [route, params],
    () => apiClient.get(route, params),
    {
      keepPreviousData: true,
      ...options,
    },
  );
}

export function useGetNotificationTypes() {
  const apiClient = useApiClient();
  const route = "notification_types";

  return useQuery<NotificationType[], Error>([route], () =>
    apiClient.get(route),
  );
}

export function useGetUnreadNotificationCount(
  options?: UseQueryOptions<{ unread_count: number }, Error>,
) {
  const apiClient = useApiClient();
  const route = "notifications/unread_count";

  return useQuery<{ unread_count: number }, Error>(
    [route],
    () => apiClient.get(route),
    {
      refetchInterval: 60_000,
      ...options,
    },
  );
}

export function useCreateNotifications(onSuccess: Function) {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const apiClient = useApiClient();
  const route = "notifications";

  return useMutation({
    mutationFn: async (payload: CreateNotificationPayload) => {
      const response = await apiClient.post(route, payload);

      if (!response.ok) {
        const errorMessage =
          (await response.json().catch(() => null))?.detail ??
          `Error ${response.status}`;
        enqueueSnackbar(errorMessage, { variant: "error" });
        throw Error(errorMessage);
      }

      const responseJson: NotificationCreateResult = await response.json();
      onSuccess(responseJson);
      queryClient.invalidateQueries("notifications");
      queryClient.invalidateQueries("notifications/unread_count");
      return responseJson;
    },
    onSuccess: (result) => {
      enqueueSnackbar(
        `Created ${result.created_count} notification${result.created_count === 1 ? "" : "s"}.`,
        {
          variant: "success",
        },
      );
    },
    retry: 0,
  });
}

export function useUpdateNotificationReadStatus(onSuccess?: Function) {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const apiClient = useApiClient();
  const route = "notifications";

  return useMutation({
    mutationFn: async (payload: { id: number; is_read: boolean }) => {
      const response = await apiClient.patch(route, payload);

      if (!response.ok) {
        const errorMessage =
          (await response.json().catch(() => null))?.detail ??
          `Error ${response.status}`;
        enqueueSnackbar(errorMessage, { variant: "error" });
        throw Error(errorMessage);
      }

      return response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries("notifications");
      queryClient.invalidateQueries("notifications/unread_count");
      onSuccess?.(result);
    },
    retry: 0,
  });
}
