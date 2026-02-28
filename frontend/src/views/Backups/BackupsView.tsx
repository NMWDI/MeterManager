import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Stack,
} from "@mui/material";
import { Storage, Refresh, Download } from "@mui/icons-material";
import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { useQuery } from "react-query";
import { Route } from "@/routes/manage/backups";
import { useNavigate } from "@tanstack/react-router";
import { BackupRow } from "@/interfaces/BackupRow";
import { useFetchWithAuth } from "@/hooks";
import { BackgroundBox, CustomCardHeader } from "@/components";
import { toYYYYMMDD, formatBytes } from "@/utils";

export const BackupsView = () => {
  const navigate = useNavigate();
  const { page, pageSize } = Route.useSearch();

  const fetchWithAuth = useFetchWithAuth();
  const [downloading, setDownloading] = useState<Record<string, boolean>>({});

  const { data, isLoading, error, refetch, isFetching } = useQuery<
    BackupRow[],
    Error
  >({
    queryKey: ["db-backups"],
    queryFn: async () => {
      const res = await fetchWithAuth({
        method: "GET",
        route: "/db-backups",
        params: {
          include_signed_urls: false,
          signed_expires_minutes: 60,
          limit: 500,
        },
      });

      return (res ?? []).map((b: any) => ({
        id: b.name, // unique per object
        name: b.name,
        file_size: b.file_size ?? 0,
        format: b.format ?? "unknown",
        gs_uri: b.gs_uri,
        created_utc: b.created_utc ?? null,
      }));
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const handleDownload = useCallback(
    async (fileName: string) => {
      try {
        setDownloading((prev) => ({ ...prev, [fileName]: true }));

        const blob = (await fetchWithAuth({
          method: "GET",
          route: `/db-backups/${encodeURIComponent(fileName)}/download`,
          responseType: "blob",
        })) as Blob;

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } finally {
        setDownloading((prev) => ({ ...prev, [fileName]: false }));
      }
    },
    [fetchWithAuth, setDownloading],
  );

  const columns = useMemo<GridColDef<BackupRow>[]>(
    () => [
      {
        field: "name",
        headerName: "Name",
        flex: 1,
        minWidth: 280,
      },
      {
        field: "file_size",
        headerName: "Size",
        width: 150,
        valueFormatter: (value) => formatBytes(Number(value ?? 0)),
      },
      {
        field: "created_utc",
        headerName: "Created",
        width: 225,
        valueFormatter: (value) =>
          toYYYYMMDD((value as string | null | undefined) ?? null),
      },
      {
        field: "actions",
        headerName: "Actions",
        width: 200,
        sortable: false,
        filterable: false,
        renderCell: (params: GridRenderCellParams<BackupRow>) => {
          const fileName = params.row.name;
          const isDownloading = !!downloading[fileName];

          return (
            <Stack direction="row" spacing={1}>
              <span>
                <Button
                  size="small"
                  variant="contained"
                  disabled={isDownloading || !fileName}
                  onClick={() => handleDownload(fileName)}
                  startIcon={
                    isDownloading ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <Download />
                    )
                  }
                >
                  {isDownloading ? "Downloading" : "Download"}
                </Button>
              </span>
            </Stack>
          );
        },
      },
    ],
    [downloading, handleDownload],
  );

  return (
    <BackgroundBox>
      <Card sx={{ height: "fit-content" }}>
        <CustomCardHeader title="Backups" icon={Storage} />
        <CardContent>
          {error && (
            <Alert
              severity="error"
              sx={{ mb: 2 }}
              action={
                <Button
                  variant="outlined"
                  color="inherit"
                  size="small"
                  onClick={() => refetch()}
                  startIcon={<Refresh />}
                >
                  Retry
                </Button>
              }
            >
              <AlertTitle>Error Loading Backups</AlertTitle>
              We couldn’t load backup data. Please try again.
            </Alert>
          )}
          <Grid container spacing={1} sx={{ mt: 0.125 }}>
            <Grid item xs={12}>
              <div style={{ height: 600, width: "100%" }}>
                <DataGrid
                  rows={data ?? []}
                  columns={columns}
                  loading={isLoading || isFetching}
                  disableRowSelectionOnClick
                  disableColumnResize={false}
                  pagination
                  initialState={{
                    pagination: { paginationModel: { page: 0, pageSize: 25 } },
                  }}
                  pageSizeOptions={[10, 25, 50, 100]}
                  paginationModel={{ page, pageSize }}
                  onPaginationModelChange={(m) => {
                    navigate({
                      to: "/manage/backups",
                      search: {
                        page: m.page,
                        pageSize: m.pageSize,
                      },
                      replace: true, // avoid polluting history on every click
                    });
                  }}
                  slotProps={{
                    toolbar: {
                      showQuickFilter: true,
                      quickFilterProps: { debounceMs: 300 },
                    },
                  }}
                />
              </div>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </BackgroundBox>
  );
};
