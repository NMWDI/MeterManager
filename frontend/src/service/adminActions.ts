import { useSnackbar } from "notistack";
import { useMutation, useQueryClient } from "react-query";
import { useApiClient } from "@/hooks";
import { BackupDbResult, OSEOwnerSyncResult } from "@/interfaces";

export function useRunOSEOwnerSync() {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const apiClient = useApiClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post("admin/ose-owner-sync", {});

      if (!response.ok) {
        const errorMessage =
          (await response.json().catch(() => null))?.detail ??
          `Error ${response.status}`;
        enqueueSnackbar(errorMessage, { variant: "error" });
        throw Error(errorMessage);
      }

      return (await response.json()) as OSEOwnerSyncResult;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries("notifications");
      queryClient.invalidateQueries("notifications/unread_count");
      queryClient.invalidateQueries("admin/ose-owner-change-requests");
      enqueueSnackbar(`Created ${result.created_request_count} owner changes.`, {
        variant: "success",
      });
    },
    retry: 0,
  });
}

export function useCreateDatabaseBackup() {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const apiClient = useApiClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post("backup-db/", {});

      if (!response.ok) {
        const errorMessage =
          (await response.json().catch(() => null))?.detail ??
          `Error ${response.status}`;
        enqueueSnackbar(errorMessage, { variant: "error" });
        throw Error(errorMessage);
      }

      return (await response.json()) as BackupDbResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries("db-backups");
      enqueueSnackbar("Database backup created.", { variant: "success" });
    },
    retry: 0,
  });
}
