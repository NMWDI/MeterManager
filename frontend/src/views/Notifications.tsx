import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  FormControl,
  Grid,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";
import { Add, NotificationsOutlined, Search } from "@mui/icons-material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { DatePicker } from "@mui/x-date-pickers";
import { useNavigate } from "@tanstack/react-router";
import { useAuthUser } from "react-auth-kit";
import {
  BackgroundBox,
  CreateNotificationModal,
  CustomCardHeader,
  TristateToggle,
} from "@/components";
import { Notification, SecurityScope } from "@/interfaces";
import { Route } from "@/routes/notifications";
import {
  useCreateNotifications,
  useGetNotifications,
  useGetNotificationTypes,
  useGetRoles,
  useGetUnreadNotificationCount,
  useUpdateNotificationReadStatus,
  useGetUserAdminList,
} from "@/service";

const formatNotificationTypeName = (value: string) =>
  value
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

export const Notifications = () => {
  const navigate = useNavigate();
  const authUser = useAuthUser();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const search = Route.useSearch();
  const isAdmin =
    authUser()?.user_role?.security_scopes?.some(
      (scope: SecurityScope) => scope.scope_string === "admin",
    ) ?? false;
  const notificationTypesQuery = useGetNotificationTypes();
  const rolesQuery = useGetRoles({ enabled: isAdmin });
  const usersQuery = useGetUserAdminList({ enabled: isAdmin });
  const createNotifications = useCreateNotifications(() => {
    setIsCreateModalOpen(false);
  });
  const updateNotificationReadStatus = useUpdateNotificationReadStatus();
  const notificationTypeIds = useMemo(
    () => (notificationTypesQuery.data ?? []).map((type) => type.id),
    [notificationTypesQuery.data],
  );

  useEffect(() => {
    if (!notificationTypeIds.length || search.notification_type_id.length)
      return;

    setSearch((prev) => ({
      ...prev,
      notification_type_id: notificationTypeIds,
      page: 0,
    }));
  }, [notificationTypeIds, search.notification_type_id.length]);

  const notificationsQuery = useGetNotifications({
    q: search.q || undefined,
    is_read:
      search.is_read === "all"
        ? undefined
        : search.is_read === "true"
          ? true
          : false,
    notification_type_id:
      search.notification_type_id.length > 0
        ? search.notification_type_id
        : notificationTypeIds.length > 0
          ? notificationTypeIds
          : undefined,
    created_from: search.created_from,
    created_to: search.created_to,
    limit: search.pageSize,
    offset: search.page * search.pageSize,
  });

  const setSearch = (updater: (prev: typeof search) => any) => {
    navigate({
      to: "/notifications",
      search: (prev) => updater(prev as typeof search),
      replace: true,
    });
  };

  const columns = useMemo<GridColDef<Notification>[]>(
    () => [
      {
        field: "read_toggle",
        headerName: "Mark Read",
        minWidth: 110,
        flex: 0.7,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <Checkbox
            size="small"
            checked={Boolean(params.row.is_read)}
            onChange={(_, checked) =>
              updateNotificationReadStatus.mutate({
                id: params.row.id,
                is_read: checked,
              })
            }
          />
        ),
      },
      {
        field: "created_at",
        headerName: "Created",
        minWidth: 190,
        flex: 1.1,
        valueFormatter: (value) =>
          value ? dayjs(value as string).format("MMMM D, YYYY h:mm A") : "-",
      },
      {
        field: "notification_type",
        headerName: "Type",
        minWidth: 140,
        flex: 0.9,
        sortable: false,
        valueGetter: (_, row) => row.notification_type?.name ?? "",
        renderCell: (params) => (
          <Chip
            size="small"
            label={formatNotificationTypeName(String(params.value ?? ""))}
            sx={{ textTransform: "capitalize" }}
          />
        ),
      },
      {
        field: "is_read",
        headerName: "Status",
        minWidth: 110,
        flex: 0.7,
        renderCell: (params) => (
          <Chip
            size="small"
            color={params.value ? "default" : "warning"}
            label={params.value ? "Read" : "Unread"}
            variant={params.value ? "outlined" : "filled"}
          />
        ),
      },
      {
        field: "title",
        headerName: "Title",
        minWidth: 220,
        flex: 1.4,
      },
      {
        field: "message",
        headerName: "Message",
        minWidth: 320,
        flex: 2.3,
      },
      {
        field: "link",
        headerName: "Link",
        minWidth: 180,
        flex: 1.2,
        sortable: false,
        renderCell: (params) => {
          const value = params.value as string | null | undefined;
          if (!value) return "-";

          return (
            <a
              href={value}
              target={value.startsWith("/") ? undefined : "_blank"}
              rel={value.startsWith("/") ? undefined : "noreferrer"}
            >
              Open
            </a>
          );
        },
      },
      {
        field: "read_at",
        headerName: "Read At",
        minWidth: 190,
        flex: 1.1,
        valueFormatter: (value) =>
          value ? dayjs(value as string).format("MMMM D, YYYY h:mm A") : "-",
      },
    ],
    [],
  );

  return (
    <BackgroundBox>
      <Card sx={{ height: "fit-content", overflow: "hidden" }}>
        <CustomCardHeader title="Notifications" icon={NotificationsOutlined} />
        <CardContent>
          <Grid
            container
            justifyContent="flex-start"
            alignContent="center"
            spacing={2}
            paddingY={2}
            sx={{ mb: 1 }}
          >
            <Grid item xs={12} md={2}>
              <DatePicker
                label="From"
                value={search.created_from ? dayjs(search.created_from) : null}
                onChange={(value) =>
                  setSearch((prev) => ({
                    ...prev,
                    created_from:
                      value && value.isValid()
                        ? value.format("YYYY-MM-DD")
                        : undefined,
                    page: 0,
                  }))
                }
                views={["year", "month", "day"]}
                openTo="year"
                format="YYYY MMMM DD"
                slotProps={{ textField: { size: "small", fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <DatePicker
                label="To"
                value={search.created_to ? dayjs(search.created_to) : null}
                onChange={(value) =>
                  setSearch((prev) => ({
                    ...prev,
                    created_to:
                      value && value.isValid()
                        ? value.format("YYYY-MM-DD")
                        : undefined,
                    page: 0,
                  }))
                }
                views={["year", "month", "day"]}
                openTo="year"
                format="YYYY MMMM DD"
                slotProps={{ textField: { size: "small", fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel id="notification-type-label">Type</InputLabel>
                <Select
                  multiple
                  labelId="notification-type-label"
                  label="Type"
                  value={search.notification_type_id}
                  onChange={(e) =>
                    setSearch((prev) => ({
                      ...prev,
                      notification_type_id: (e.target.value as number[]).map(
                        Number,
                      ),
                      page: 0,
                    }))
                  }
                  renderValue={(selected) =>
                    (selected as number[])
                      .map(
                        (id) =>
                          notificationTypesQuery.data?.find(
                            (type) => type.id === id,
                          )?.name ?? "",
                      )
                      .filter(Boolean)
                      .map(formatNotificationTypeName)
                      .join(", ")
                  }
                >
                  {(notificationTypesQuery.data ?? []).map((type) => (
                    <MenuItem key={type.id} value={type.id}>
                      {formatNotificationTypeName(type.name)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs sx={{ flexGrow: 1 }}>
              <FormControl fullWidth size="small">
                <TextField
                  fullWidth
                  size="small"
                  label="Search"
                  value={search.q ?? ""}
                  onChange={(e) =>
                    setSearch((prev) => ({
                      ...prev,
                      q: e.target.value,
                      page: 0,
                    }))
                  }
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              </FormControl>
            </Grid>
            <Grid
              item
              xs={12}
              ml={-2}
              md="auto"
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: { xs: "center", md: "flex-end" },
              }}
            >
              <TristateToggle
                label="Read"
                value={search.is_read}
                onToggle={(next) =>
                  setSearch((prev) => ({
                    ...prev,
                    is_read: next,
                    page: 0,
                  }))
                }
              />
            </Grid>
          </Grid>

          {notificationsQuery.error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              Failed to load notifications.
            </Alert>
          ) : null}

          <Box sx={{ width: "100%", height: 640 }}>
            <DataGrid
              rows={notificationsQuery.data?.items ?? []}
              columns={columns}
              rowCount={notificationsQuery.data?.total ?? 0}
              loading={
                notificationsQuery.isLoading || notificationTypesQuery.isLoading
              }
              pagination
              paginationMode="server"
              pageSizeOptions={[10, 25, 50, 100]}
              paginationModel={{
                page: search.page,
                pageSize: search.pageSize,
              }}
              onPaginationModelChange={(model) =>
                setSearch((prev) => ({
                  ...prev,
                  pageSize: model.pageSize,
                  page: model.pageSize !== prev.pageSize ? 0 : model.page,
                }))
              }
              disableRowSelectionOnClick
              disableColumnMenu
              getRowHeight={() => "auto"}
              sx={{
                "& .MuiDataGrid-cell": {
                  alignItems: "center",
                  py: 1.25,
                },
              }}
            />
          </Box>
          <Grid
            container
            sx={{ pt: 2 }}
            justifyContent="space-between"
            alignItems="center"
          >
            <Grid item>
              <Button
                onClick={() =>
                  setSearch((prev) => ({
                    ...prev,
                    q: "",
                    is_read: "false",
                    notification_type_id: notificationTypeIds,
                    created_from: undefined,
                    created_to: dayjs().endOf("month").format("YYYY-MM-DD"),
                    page: 0,
                  }))
                }
              >
                Reset
              </Button>
            </Grid>
            {isAdmin ? (
              <Grid item>
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => setIsCreateModalOpen(true)}
                  startIcon={<Add fontSize="small" />}
                >
                  Create
                </Button>
              </Grid>
            ) : null}
          </Grid>
          {isAdmin ? (
            <CreateNotificationModal
              open={isCreateModalOpen}
              onClose={() => setIsCreateModalOpen(false)}
              users={usersQuery.data ?? []}
              roles={rolesQuery.data ?? []}
              notificationTypes={notificationTypesQuery.data ?? []}
              loading={createNotifications.isLoading}
              onSubmit={(payload) => createNotifications.mutate(payload)}
            />
          ) : null}
        </CardContent>
      </Card>
    </BackgroundBox>
  );
};
