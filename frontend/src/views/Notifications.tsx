import { useCallback, useEffect, useMemo, useState } from "react";
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
import {
  Add,
  NotificationsOutlined,
  Search,
  TaskAlt,
} from "@mui/icons-material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { DatePicker } from "@mui/x-date-pickers";
import { useNavigate } from "@tanstack/react-router";
import { useAuthUser } from "react-auth-kit";
import {
  BackgroundBox,
  CreateNotificationModal,
  CustomCardHeader,
  TristateToggle,
  UserAvatar,
} from "@/components";
import {
  MeterContact,
  MeterOwnerChangeRequest,
  Notification,
  SecurityScope,
  User,
} from "@/interfaces";
import { Route } from "@/routes/notifications";
import {
  useCreateNotifications,
  useAcceptOwnerChangeRequest,
  useGetNotifications,
  useGetNotificationTypes,
  useGetOwnerChangeRequests,
  useGetRoles,
  useRejectOwnerChangeRequest,
  useUpdateNotificationReadStatus,
  useGetUserAdminList,
} from "@/service";
import { getRoleLabel } from "@/utils/UserRoleGrouping";

const formatNotificationTypeName = (value: string) =>
  value
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const formatContacts = (contacts: MeterContact[] | undefined) => {
  if (!contacts?.length) return "-";
  return contacts
    .map((contact) =>
      [
        contact.name,
        contact.phone,
        contact.cell,
        contact.email,
        contact.address,
      ]
        .filter(Boolean)
        .join(" | "),
    )
    .join("; ");
};

type OwnerChangeDiffLine = {
  prefix: "+" | "-" | " " | "@";
  text: string;
  field?: "water_users" | "contacts";
};

const contactDiffFields: Array<{
  key: keyof Pick<
    MeterContact,
    "name" | "phone" | "cell" | "email" | "address"
  >;
  label: string;
}> = [
  { key: "name", label: "name" },
  { key: "phone", label: "phone" },
  { key: "cell", label: "cell" },
  { key: "email", label: "email" },
  { key: "address", label: "address" },
];

const normalizedDiffValue = (value: string | null | undefined) =>
  value?.trim() || "-";

const buildFieldDiffLines = (
  label: string,
  oldValue: string | null | undefined,
  newValue: string | null | undefined,
  field: OwnerChangeDiffLine["field"],
): OwnerChangeDiffLine[] => {
  const currentValue = normalizedDiffValue(oldValue);
  const oseValue = normalizedDiffValue(newValue);

  if (currentValue === oseValue) {
    return [{ prefix: " ", text: `${label}: ${currentValue}`, field }];
  }

  return [
    { prefix: "-", text: `${label}: ${currentValue}`, field },
    { prefix: "+", text: `${label}: ${oseValue}`, field },
  ];
};

const buildContactsDiffLines = (
  oldContacts: MeterContact[],
  newContacts: MeterContact[],
): OwnerChangeDiffLine[] => {
  const maxContacts = Math.max(oldContacts.length, newContacts.length);

  if (!maxContacts) {
    return [{ prefix: " ", text: "No contacts" }];
  }

  return Array.from({ length: maxContacts }).flatMap((_, index) => {
    const oldContact = oldContacts[index];
    const newContact = newContacts[index];
    const contactLabel = `Contact ${index + 1}`;
    const fieldLines = contactDiffFields.flatMap(({ key, label }) => {
      const oldValue = oldContact?.[key];
      const newValue = newContact?.[key];

      if (!oldValue && !newValue) return [];

      return buildFieldDiffLines(
        `${contactLabel} ${label}`,
        oldValue,
        newValue,
        "contacts",
      );
    });

    if (!fieldLines.length) return [];

    return [
      { prefix: "@", text: contactLabel, field: "contacts" },
      ...fieldLines,
    ];
  });
};

const buildOwnerChangeDiffLines = (
  request: MeterOwnerChangeRequest,
): OwnerChangeDiffLine[] => [
  { prefix: "@", text: "Water users", field: "water_users" },
  ...buildFieldDiffLines(
    "water users",
    request.old_water_users,
    request.new_water_users,
    "water_users",
  ),
  { prefix: "@", text: "Contacts", field: "contacts" },
  ...buildContactsDiffLines(request.old_contacts, request.new_contacts),
];

type NotificationSearch = ReturnType<typeof Route.useSearch> & {
  created_from?: string;
  created_to?: string;
  owner_change_request_id?: number;
};

export const Notifications = () => {
  const navigate = useNavigate();
  const authUser = useAuthUser();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [ownerChangeSelections, setOwnerChangeSelections] = useState<
    Record<number, { apply_water_users: boolean; apply_contacts: boolean }>
  >({});
  const [ownerChangePage, setOwnerChangePage] = useState(0);
  const [ownerChangePageSize, setOwnerChangePageSize] = useState(5);
  const search = Route.useSearch();
  const isAdmin =
    authUser()?.user_role?.security_scopes?.some(
      (scope: SecurityScope) => scope.scope_string === "admin",
    ) ?? false;
  const notificationTypesQuery = useGetNotificationTypes();
  const rolesQuery = useGetRoles({ enabled: isAdmin });
  const usersQuery = useGetUserAdminList({ enabled: isAdmin });
  const ownerChangeRequestsQuery = useGetOwnerChangeRequests({
    enabled: isAdmin,
  });
  const acceptOwnerChangeRequest = useAcceptOwnerChangeRequest();
  const rejectOwnerChangeRequest = useRejectOwnerChangeRequest();
  const createNotifications = useCreateNotifications(() => {
    setIsCreateModalOpen(false);
  });
  const updateNotificationReadStatus = useUpdateNotificationReadStatus();
  const notificationTypeIds = useMemo(
    () => (notificationTypesQuery.data ?? []).map((type) => type.id),
    [notificationTypesQuery.data],
  );
  const getAvatarRole = useCallback(
    (user: User | null | undefined) => (user ? getRoleLabel(user) : undefined),
    [],
  );
  const ownerChangeRequests = useMemo(
    () => ownerChangeRequestsQuery.data ?? [],
    [ownerChangeRequestsQuery.data],
  );

  const setSearch = useCallback(
    (updater: (prev: NotificationSearch) => NotificationSearch) => {
      navigate({
        to: "/notifications",
        search: (prev) => updater(prev as NotificationSearch),
        replace: true,
      });
    },
    [navigate],
  );

  useEffect(() => {
    if (!notificationTypeIds.length || search.notification_type_id.length)
      return;

    setSearch((prev) => ({
      ...prev,
      notification_type_id: notificationTypeIds,
      page: 0,
    }));
  }, [notificationTypeIds, search.notification_type_id.length, setSearch]);

  useEffect(() => {
    setOwnerChangeSelections((prev) => {
      const next = { ...prev };
      for (const request of ownerChangeRequestsQuery.data ?? []) {
        if (!next[request.id]) {
          next[request.id] = {
            apply_water_users:
              request.old_water_users !== request.new_water_users,
            apply_contacts:
              formatContacts(request.old_contacts) !==
              formatContacts(request.new_contacts),
          };
        }
      }
      return next;
    });
  }, [ownerChangeRequestsQuery.data]);

  useEffect(() => {
    const lastPage = Math.max(
      0,
      Math.ceil(ownerChangeRequests.length / ownerChangePageSize) - 1,
    );

    if (ownerChangePage > lastPage) {
      setOwnerChangePage(lastPage);
    }
  }, [ownerChangePage, ownerChangePageSize, ownerChangeRequests.length]);

  useEffect(() => {
    if (!search.owner_change_request_id) return;

    const linkedRequestIndex = ownerChangeRequests.findIndex(
      (request) => request.id === search.owner_change_request_id,
    );

    if (linkedRequestIndex === -1) return;

    const linkedRequestPage = Math.floor(
      linkedRequestIndex / ownerChangePageSize,
    );

    if (linkedRequestPage !== ownerChangePage) {
      setOwnerChangePage(linkedRequestPage);
    }
  }, [
    ownerChangePage,
    ownerChangePageSize,
    ownerChangeRequests,
    search.owner_change_request_id,
  ]);

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

  const columns = useMemo<GridColDef<Notification>[]>(() => {
    const baseColumns: GridColDef<Notification>[] = [
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
            color={params.value ? "success" : "error"}
            label={params.value ? "Read" : "Unread"}
            variant="outlined"
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
    ];

    if (!isAdmin) return baseColumns;

    return [
      baseColumns[0],
      baseColumns[1],
      {
        field: "creator",
        headerName: "Created By",
        minWidth: 220,
        flex: 1.3,
        sortable: false,
        cellClassName: "notification-creator-cell",
        valueGetter: (_, row) =>
          row.creator?.display_name || row.creator?.full_name || "",
        renderCell: (params) => {
          const creator = params.row.creator;
          if (!creator) return "-";

          const name = creator.display_name || creator.full_name || "Unknown";

          return (
            <Box
              sx={{
                width: "100%",
                display: "flex",
                gap: 1,
                alignItems: "center",
              }}
            >
              <UserAvatar
                full_name={creator.full_name || name}
                role={getAvatarRole(creator)}
                src={creator.avatar_img ?? undefined}
                size={34}
              />
              <Box component="span">{name}</Box>
            </Box>
          );
        },
      },
      ...baseColumns.slice(2),
    ];
  }, [getAvatarRole, isAdmin, updateNotificationReadStatus]);

  const ownerChangeColumns = useMemo<GridColDef<MeterOwnerChangeRequest>[]>(
    () => [
      {
        field: "serial_number",
        headerName: "Meter",
        minWidth: 120,
        flex: 0.7,
      },
      {
        field: "diff",
        headerName: "Diff",
        minWidth: 520,
        flex: 2.8,
        sortable: false,
        filterable: false,
        cellClassName: "owner-change-top-cell",
        renderCell: (params) => {
          const selected = ownerChangeSelections[params.row.id] ?? {
            apply_water_users: true,
            apply_contacts: true,
          };
          const diffLines = buildOwnerChangeDiffLines(params.row);

          return (
            <Box
              component="pre"
              sx={{
                width: "100%",
                maxWidth: "100%",
                minWidth: 0,
                boxSizing: "border-box",
                m: 0,
                py: 1,
                px: 1.25,
                borderRadius: 1,
                bgcolor: "grey.50",
                border: "1px solid",
                borderColor: "divider",
                fontFamily:
                  '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
                fontSize: 13,
                lineHeight: 1.45,
                whiteSpace: "pre-wrap",
                overflowWrap: "anywhere",
                overflow: "hidden",
              }}
            >
              {diffLines.map((line, index) => {
                const isLineApplied =
                  line.field === "water_users"
                    ? selected.apply_water_users
                    : line.field === "contacts"
                      ? selected.apply_contacts
                      : true;

                return (
                  <Box
                    component="span"
                    key={`${line.prefix}-${line.text}-${index}`}
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "2ch minmax(0, 1fr)",
                      color: !isLineApplied
                        ? "text.disabled"
                        : line.prefix === "+"
                          ? "success.dark"
                          : line.prefix === "-"
                            ? "error.dark"
                            : line.prefix === "@"
                              ? "text.secondary"
                              : "text.primary",
                      fontWeight: line.prefix === "@" ? 600 : undefined,
                      opacity: isLineApplied ? 1 : 0.72,
                      textDecoration: isLineApplied
                        ? undefined
                        : "line-through",
                    }}
                  >
                    <Box
                      component="span"
                      sx={{
                        flex: "0 0 2ch",
                        userSelect: "none",
                      }}
                    >
                      {line.prefix === "@" ? "@@" : line.prefix}
                    </Box>
                    <Box
                      component="span"
                      sx={{
                        minWidth: 0,
                        overflowWrap: "anywhere",
                        wordBreak: "break-word",
                      }}
                    >
                      {line.text}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          );
        },
      },
      {
        field: "apply",
        headerName: "Apply",
        minWidth: 170,
        flex: 0.8,
        sortable: false,
        filterable: false,
        cellClassName: "owner-change-top-cell",
        renderCell: (params) => {
          const selected = ownerChangeSelections[params.row.id] ?? {
            apply_water_users: true,
            apply_contacts: true,
          };

          return (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 0.5,
              }}
            >
              <Box
                component="label"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  whiteSpace: "nowrap",
                }}
              >
                <Checkbox
                  size="small"
                  checked={selected.apply_water_users}
                  onChange={(_, checked) =>
                    setOwnerChangeSelections((prev) => ({
                      ...prev,
                      [params.row.id]: {
                        ...selected,
                        apply_water_users: checked,
                      },
                    }))
                  }
                />
                Water users
              </Box>
              <Box
                component="label"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  whiteSpace: "nowrap",
                }}
              >
                <Checkbox
                  size="small"
                  checked={selected.apply_contacts}
                  onChange={(_, checked) =>
                    setOwnerChangeSelections((prev) => ({
                      ...prev,
                      [params.row.id]: {
                        ...selected,
                        apply_contacts: checked,
                      },
                    }))
                  }
                />
                Contacts
              </Box>
            </Box>
          );
        },
      },
      {
        field: "actions",
        headerName: "Actions",
        minWidth: 170,
        flex: 0.8,
        sortable: false,
        filterable: false,
        align: "right",
        headerAlign: "right",
        renderCell: (params) => {
          const selected = ownerChangeSelections[params.row.id] ?? {
            apply_water_users: true,
            apply_contacts: true,
          };

          return (
            <Box
              sx={{
                width: "100%",
                display: "flex",
                justifyContent: "flex-end",
                gap: 0.5,
              }}
            >
              <Button
                size="small"
                onClick={() =>
                  acceptOwnerChangeRequest.mutate({
                    id: params.row.id,
                    payload: selected,
                  })
                }
                disabled={
                  acceptOwnerChangeRequest.isLoading ||
                  (!selected.apply_water_users && !selected.apply_contacts)
                }
              >
                Accept
              </Button>
              <Button
                size="small"
                color="error"
                onClick={() => rejectOwnerChangeRequest.mutate(params.row.id)}
                disabled={rejectOwnerChangeRequest.isLoading}
              >
                Reject
              </Button>
            </Box>
          );
        },
      },
    ],
    [
      acceptOwnerChangeRequest,
      ownerChangeSelections,
      rejectOwnerChangeRequest,
    ],
  );

  return (
    <BackgroundBox>
      <Grid
        container
        spacing={2}
        sx={{ minHeight: { xs: "100vh", lg: "60vh" } }}
      >
        <Grid item xs={12}>
          <Card sx={{ height: "fit-content", overflow: "hidden" }}>
            <CustomCardHeader
              title="Notifications"
              icon={NotificationsOutlined}
            />
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
                    value={
                      search.created_from ? dayjs(search.created_from) : null
                    }
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
                    slotProps={{
                      textField: { size: "small", fullWidth: true },
                    }}
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
                    slotProps={{
                      textField: { size: "small", fullWidth: true },
                    }}
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
                          notification_type_id: (
                            e.target.value as number[]
                          ).map(Number),
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
                    notificationsQuery.isLoading ||
                    notificationTypesQuery.isLoading
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
                    "& .notification-creator-cell": {
                      alignItems: "flex-start",
                      py: 1,
                    },
                    "& .MuiDataGrid-cell": {
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
        </Grid>

        {isAdmin ? (
          <Grid item xs={12}>
            <Card sx={{ height: "fit-content", overflow: "hidden" }}>
              <CustomCardHeader title="Owner Change Review" icon={TaskAlt} />
              <CardContent>
                <Box sx={{ width: "100%", height: 640 }}>
                  <DataGrid
                    rows={ownerChangeRequests}
                    columns={ownerChangeColumns}
                    loading={ownerChangeRequestsQuery.isLoading}
                    pagination
                    pageSizeOptions={[5, 10, 25, 50]}
                    paginationModel={{
                      page: ownerChangePage,
                      pageSize: ownerChangePageSize,
                    }}
                    onPaginationModelChange={(model) => {
                      setOwnerChangePageSize(model.pageSize);
                      setOwnerChangePage(
                        model.pageSize !== ownerChangePageSize
                          ? 0
                          : model.page,
                      );
                    }}
                    disableRowSelectionOnClick
                    rowSelection={false}
                    disableColumnMenu
                    getRowHeight={() => "auto"}
                    getRowClassName={(params) =>
                      search.owner_change_request_id === params.row.id
                        ? "owner-change-linked-row"
                        : ""
                    }
                    sx={{
                      "& .owner-change-top-cell": {
                        alignItems: "flex-start",
                        py: 1,
                      },
                      "& .MuiDataGrid-cell": {
                        py: 1.25,
                        outline: "none",
                      },
                      "& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within": {
                        outline: "none",
                      },
                      "& .MuiDataGrid-row.Mui-selected, & .MuiDataGrid-row.Mui-selected:hover":
                        {
                          bgcolor: "transparent",
                        },
                      "& .MuiDataGrid-row:hover": {
                        bgcolor: "transparent",
                      },
                      "& .owner-change-linked-row": {
                        boxShadow: (theme) =>
                          `inset 3px 0 0 ${theme.palette.primary.main}`,
                      },
                    }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ) : null}
      </Grid>
    </BackgroundBox>
  );
};
