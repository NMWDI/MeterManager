import { useSnackbar } from "notistack";
import { useMutation, useQuery, useQueryClient, UseQueryOptions } from "react-query";
import { useApiClient } from "@/hooks";
import {
  CreateNotificationPayload,
  Notification,
  NotificationCreateResult,
  NotificationQueryParams,
  NotificationType,
  MeterOwnerChangeAcceptPayload,
  MeterOwnerChangeRequest,
  Page,
} from "@/interfaces";

type MutationSuccessHandler<T = unknown> = (result: T) => void;

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

export function useCreateNotifications(
  onSuccess: MutationSuccessHandler<NotificationCreateResult>,
) {
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

export function useUpdateNotificationReadStatus(
  onSuccess?: MutationSuccessHandler,
) {
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

export function useGetOwnerChangeRequests(
  options?: UseQueryOptions<MeterOwnerChangeRequest[], Error>,
) {
  const apiClient = useApiClient();
  const route = "admin/ose-owner-change-requests";

  return useQuery<MeterOwnerChangeRequest[], Error>(
    [route],
    () => apiClient.get(route),
    options,
  );
}

export function useAcceptOwnerChangeRequest(
  onSuccess?: MutationSuccessHandler<MeterOwnerChangeRequest>,
) {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const apiClient = useApiClient();

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: number;
      payload: MeterOwnerChangeAcceptPayload;
    }) => {
      const response = await apiClient.post(
        `admin/ose-owner-change-requests/${id}/accept`,
        payload,
      );

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
      queryClient.invalidateQueries("admin/ose-owner-change-requests");
      queryClient.invalidateQueries("meter");
      queryClient.invalidateQueries("meters");
      enqueueSnackbar("Owner change applied.", { variant: "success" });
      onSuccess?.(result);
    },
    retry: 0,
  });
}

export function useRejectOwnerChangeRequest(
  onSuccess?: MutationSuccessHandler<MeterOwnerChangeRequest>,
) {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const apiClient = useApiClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await apiClient.post(
        `admin/ose-owner-change-requests/${id}/reject`,
        {},
      );

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
      queryClient.invalidateQueries("admin/ose-owner-change-requests");
      enqueueSnackbar("Owner change rejected.", { variant: "success" });
      onSuccess?.(result);
    },
    retry: 0,
  });
}

export function useAcceptAllOwnerChangeRequests(
  onSuccess?: MutationSuccessHandler<{ accepted_count: number }>,
) {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const apiClient = useApiClient();
  const route = "admin/ose-owner-change-requests/accept-all";

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post(route, {});

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
      queryClient.invalidateQueries("admin/ose-owner-change-requests");
      queryClient.invalidateQueries("meter");
      queryClient.invalidateQueries("meters");
      enqueueSnackbar(`Applied ${result.accepted_count} owner changes.`, {
        variant: "success",
      });
      onSuccess?.(result);
    },
    retry: 0,
  });
}
