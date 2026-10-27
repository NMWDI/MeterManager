import { useMemo, useState } from "react";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  AdminPanelSettingsOutlined,
  Backup,
  DeleteOutline,
  PeopleAltOutlined,
  Refresh,
  Sync,
} from "@mui/icons-material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { useNavigate } from "@tanstack/react-router";
import { BackgroundBox, CustomCardHeader, RoleChip } from "@/components";
import { AdminUserSessionSummary } from "@/interfaces";
import { Route } from "@/routes/admin-dashboard";
import {
  useCreateDatabaseBackup,
  useGetAdminActiveUserSessions,
  useRevokeAdminUserSession,
  useRunOSEOwnerSync,
} from "@/service";

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const getUserDisplayName = (session: AdminUserSessionSummary) =>
  session.display_name || session.full_name || session.username;

const getDeviceDisplayName = (session: AdminUserSessionSummary) =>
  [session.browser, session.operating_system, session.device_type]
    .filter(Boolean)
    .join(" / ") || "-";

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const runOSEOwnerSync = useRunOSEOwnerSync();
  const createDatabaseBackup = useCreateDatabaseBackup();
  const activeUserSessionsQuery = useGetAdminActiveUserSessions({
    refetchInterval: 60_000,
  });
  const revokeAdminUserSession = useRevokeAdminUserSession();
  const [closingSessionIdentifier, setClosingSessionIdentifier] = useState<
    string | null
  >(null);

  const setSearch = (updater: (prev: typeof search) => any) => {
    navigate({
      to: "/admin-dashboard",
      search: (prev) => updater(prev as any),
      replace: true,
    });
  };

  const activeSessionColumns = useMemo<GridColDef<AdminUserSessionSummary>[]>(
    () => [
      {
        field: "display_name",
        headerName: "User",
        flex: 1,
        minWidth: 150,
        valueGetter: (_, row) => getUserDisplayName(row),
        renderCell: (params) => (
          <Stack spacing={0.25} sx={{ py: 0.5 }}>
            <Typography variant="body2" fontWeight={600}>
              {getUserDisplayName(params.row)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {params.row.username}
            </Typography>
          </Stack>
        ),
      },
      {
        field: "role_name",
        headerName: "Role",
        width: 140,
        renderCell: (params) =>
          params.row.role_name ? <RoleChip role={params.row.role_name} /> : "-",
      },
      {
        field: "device",
        headerName: "Device",
        flex: 1.4,
        minWidth: 220,
        valueGetter: (_, row) => getDeviceDisplayName(row),
      },
      {
        field: "ip_address",
        headerName: "IP Address",
        width: 150,
        valueGetter: (_, row) => row.ip_address ?? "-",
      },
      {
        field: "signed_in_at",
        headerName: "Signed In",
        width: 200,
        valueFormatter: (value) => formatDateTime(value as string),
      },
      {
        field: "last_seen_at",
        headerName: "Last Active",
        width: 200,
        valueFormatter: (value) => formatDateTime(value as string),
      },
      {
        field: "actions",
        headerName: "Actions",
        width: 175,
        sortable: false,
        filterable: false,
        renderCell: (params) => {
          const isClosing =
            closingSessionIdentifier === params.row.session_identifier;

          return (
            <Button
              color="error"
              size="small"
              variant="outlined"
              startIcon={
                isClosing ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <DeleteOutline />
                )
              }
              disabled={params.row.is_current || isClosing}
              onClick={() => {
                setClosingSessionIdentifier(params.row.session_identifier);
                revokeAdminUserSession.mutate(params.row.session_identifier, {
                  onSettled: () => setClosingSessionIdentifier(null),
                });
              }}
            >
              {params.row.is_current ? "This Session" : "Sign Out"}
            </Button>
          );
        },
      },
    ],
    [closingSessionIdentifier, revokeAdminUserSession],
  );

  return (
    <BackgroundBox>
      <Grid
        container
        spacing={2}
        sx={{ minHeight: { xs: "100vh", lg: "60vh" } }}
      >
        <Grid item xs={12}>
          <Card sx={{ height: "fit-content" }}>
            <CustomCardHeader
              title="Admin Dashboard"
              icon={AdminPanelSettingsOutlined}
            />
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="h6">OSE Owner Sync</Typography>
                      <Typography color="text.secondary">
                        Fetch OSE meter owner/contact data and create
                        owner-change notifications for admin review.
                      </Typography>
                    </Box>
                    <Alert
                      severity="warning"
                      action={
                        <Button
                          color="inherit"
                          size="small"
                          disabled={
                            search.ose_acknowledged ||
                            runOSEOwnerSync.isLoading
                          }
                          onClick={() =>
                            setSearch((prev) => ({
                              ...prev,
                              ose_acknowledged: true,
                            }))
                          }
                        >
                          {search.ose_acknowledged
                            ? "Acknowledged"
                            : "Acknowledge"}
                        </Button>
                      }
                    >
                      <AlertTitle>Review Before Running</AlertTitle>
                      OSE owner sync is an expensive operation that takes
                      several minutes to complete. Do not change pages or close
                      this tab while the sync is running.
                    </Alert>
                    <Alert severity="info">
                      <AlertTitle>Recommended Schedule</AlertTitle>
                      Run OSE owner sync once per month, preferably at the
                      beginning of the month.
                    </Alert>
                    <Box>
                      <Button
                        variant="contained"
                        startIcon={
                          runOSEOwnerSync.isLoading ? (
                            <CircularProgress size={16} color="inherit" />
                          ) : (
                            <Sync />
                          )
                        }
                        disabled={
                          runOSEOwnerSync.isLoading ||
                          !search.ose_acknowledged
                        }
                        onClick={() => runOSEOwnerSync.mutate()}
                      >
                        {runOSEOwnerSync.isLoading
                          ? "Running Sync"
                          : "Run OSE Sync"}
                      </Button>
                    </Box>
                    {runOSEOwnerSync.data ? (
                      <Alert severity="success">
                        <AlertTitle>Sync Complete</AlertTitle>
                        Fetched {runOSEOwnerSync.data.fetched_count}, matched{" "}
                        {runOSEOwnerSync.data.matched_count}, found{" "}
                        {runOSEOwnerSync.data.changed_count} changes, created{" "}
                        {runOSEOwnerSync.data.created_request_count} requests
                        and {runOSEOwnerSync.data.notification_count}{" "}
                        notifications.
                      </Alert>
                    ) : null}
                  </Stack>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="h6">Database Backup</Typography>
                      <Typography color="text.secondary">
                        Create a database backup and upload it to the configured
                        backup bucket.
                      </Typography>
                    </Box>
                    <Alert severity="info">
                      <AlertTitle>Review Before Running</AlertTitle>
                      Automatic production database backups are performed daily.
                      Test database backups are performed weekly. Use this
                      action if you require an additional on-demand backup.
                    </Alert>
                    <Box>
                      <Button
                        variant="contained"
                        startIcon={
                          createDatabaseBackup.isLoading ? (
                            <CircularProgress size={16} color="inherit" />
                          ) : (
                            <Backup />
                          )
                        }
                        disabled={createDatabaseBackup.isLoading}
                        onClick={() => createDatabaseBackup.mutate()}
                      >
                        {createDatabaseBackup.isLoading
                          ? "Creating Backup"
                          : "Create Backup"}
                      </Button>
                    </Box>
                    {createDatabaseBackup.data ? (
                      <Alert severity="success">
                        <AlertTitle>Backup Complete</AlertTitle>
                        {createDatabaseBackup.data.status}
                      </Alert>
                    ) : null}
                  </Stack>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card sx={{ height: "fit-content", overflow: "hidden" }}>
            <CustomCardHeader title="Active Users" icon={PeopleAltOutlined} />
            <CardContent>
              <Grid
                container
                justifyContent="space-between"
                alignItems="center"
                spacing={2}
                paddingY={2}
                sx={{ mb: 1 }}
              >
                <Grid item>
                  <Stack direction="row" spacing={3}>
                    <Box>
                      <Typography variant="h5" fontWeight={600}>
                        {activeUserSessionsQuery.data?.active_user_count ?? 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Active Users
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="h5" fontWeight={600}>
                        {activeUserSessionsQuery.data?.active_session_count ??
                          0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Active Sessions
                      </Typography>
                    </Box>
                  </Stack>
                </Grid>
                <Grid item>
                  <Tooltip title="Refresh active users">
                    <span>
                      <IconButton
                        onClick={() => activeUserSessionsQuery.refetch()}
                        disabled={activeUserSessionsQuery.isFetching}
                      >
                        {activeUserSessionsQuery.isFetching ? (
                          <CircularProgress size={20} />
                        ) : (
                          <Refresh />
                        )}
                      </IconButton>
                    </span>
                  </Tooltip>
                </Grid>
              </Grid>

              {activeUserSessionsQuery.error ? (
                <Alert severity="error" sx={{ mb: 2 }}>
                  Failed to load active users.
                </Alert>
              ) : null}

              <Box sx={{ width: "100%", height: 520 }}>
                <DataGrid
                  rows={activeUserSessionsQuery.data?.sessions ?? []}
                  columns={activeSessionColumns}
                  getRowId={(row) => row.session_identifier}
                  loading={activeUserSessionsQuery.isLoading}
                  pagination
                  paginationModel={{
                    page: search.au_page,
                    pageSize: search.au_pageSize,
                  }}
                  onPaginationModelChange={(model) =>
                    setSearch((prev) => ({
                      ...prev,
                      au_pageSize: model.pageSize,
                      au_page:
                        model.pageSize !== prev.au_pageSize ? 0 : model.page,
                    }))
                  }
                  pageSizeOptions={[10, 25, 50, 100]}
                  disableRowSelectionOnClick
                  disableColumnMenu
                  getRowHeight={() => "auto"}
                  sx={{
                    "& .MuiDataGrid-cell": {
                      py: 1.25,
                    },
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </BackgroundBox>
  );
};
