import { useEffect, useMemo, useState } from "react";
import { Delete, Add, Handyman, Clear } from "@mui/icons-material";
import {
  DataGrid,
  GridColDef,
  GridRowModel,
  GridRenderCellParams,
  GridRowId,
} from "@mui/x-data-grid";
import { useAuthUser } from "react-auth-kit";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  useGetWorkOrders,
  useUpdateWorkOrder,
  useGetUserList,
  useDeleteWorkOrder,
  useCreateWorkOrder,
} from "@/service/ApiServiceNew";
import { WorkOrderStatus } from "@/enums";
import {
  Autocomplete,
  Box,
  Button,
  IconButton,
  Stack,
  TextField,
} from "@mui/material";
import { GridFooterWithButton, UserAvatar } from "@/components";
import { Create } from "@/components/Modals/WorkOrders";
import { MeterActivity, NewWorkOrder, User } from "@/interfaces";
import { useSnackbar } from "notistack";
import { Route } from "@/routes/workorders";
import {
  getRoleLabel,
  sortUsersByRoleThenName,
} from "@/utils/UserRoleGrouping";

const STATUS_OPTIONS: WorkOrderStatus[] = [
  WorkOrderStatus.Open,
  WorkOrderStatus.Review,
  WorkOrderStatus.Closed,
];

export const WorkOrdersTable = () => {
  const { enqueueSnackbar } = useSnackbar();

  const navigate = useNavigate();
  const search = Route.useSearch();
  const { status, assigned_user_id, q, work_order_id, page, pageSize } = search;

  const authUser = useAuthUser();
  const user = authUser();
  const currentUserId: number | undefined = user?.id;

  const hasAdminScope =
    user?.user_role.security_scopes
      .map((s: any) => s.scope_string)
      .includes("admin") ?? false;

  const userList = useGetUserList();

  const sortedUsers = useMemo<User[]>(() => {
    return sortUsersByRoleThenName((userList.data ?? []) as User[]);
  }, [userList.data]);

  const getUserByID = (id: number | undefined) =>
    userList.data?.find((u) => u.id === id);

  const getAvatarRole = (user: User | null | undefined) =>
    user ? getRoleLabel(user) : undefined;

  const getUserFromID = (id: number | undefined) =>
    getUserByID(id)?.full_name ?? "";

  const getUserIDfromName = (name: string) =>
    userList.data?.find((u) => u.full_name === name)?.id ?? undefined;

  // Helper to update URL search
  const setSearch = (updater: (prev: typeof search) => any) => {
    navigate({
      to: "/workorders",
      search: (prev) => updater(prev as any),
      replace: true,
    });
  };

  useEffect(() => {
    if (!user) return;

    // If deep-linking by ID(s), do not override
    if (work_order_id?.length) {
      navigate({
        to: "/workorders",
        search: (prev) => ({
          ...prev,
          status: STATUS_OPTIONS,
        }),
        replace: true,
      });
      return;
    }

    // Only techs get forced assigned filter
    const needsTechAssignedDefault =
      !hasAdminScope && currentUserId && !assigned_user_id;

    if (!needsTechAssignedDefault) return;

    navigate({
      to: "/workorders",
      search: (prev) => ({
        ...prev,
        assigned_user_id: currentUserId,
        page: 0,
      }),
      replace: true,
    });
  }, [
    user,
    hasAdminScope,
    currentUserId,
    assigned_user_id,
    work_order_id,
    navigate,
  ]);

  // Local input state for q (so typing doesn't spam URL)
  const [qInput, setQInput] = useState(q ?? "");
  useEffect(() => setQInput(q ?? ""), [q]);

  const workOrderList = useGetWorkOrders(
    {
      filter_by_status: status ?? [
        WorkOrderStatus.Open,
        WorkOrderStatus.Review,
      ],
      work_order_id,
      assigned_user_id,
      q,
    },
    { refetchInterval: false },
  );

  const updateWorkOrder = useUpdateWorkOrder();
  const deleteWorkOrder = useDeleteWorkOrder(() =>
    console.log("Work order deleted"),
  );
  const createWorkOrder = useCreateWorkOrder();

  const [isNewWorkOrderModalOpen, setIsNewWorkOrderModalOpen] =
    useState<boolean>(false);

  const handleRowUpdate = async (
    updatedRow: GridRowModel,
    originalRow: GridRowModel,
  ): Promise<GridRowModel> => {
    const updatedField = Object.keys(updatedRow).find(
      (key) => updatedRow[key] !== originalRow[key],
    );
    if (!updatedField) return originalRow;

    let field_data: any;

    if (updatedField === "assigned_user_id") {
      field_data = getUserIDfromName(updatedRow.assigned_user_id as string);
    } else {
      field_data = updatedRow[updatedField as string];
    }

    return updateWorkOrder.mutateAsync({
      work_order_id: updatedRow.work_order_id,
      [updatedField]: field_data,
    });
  };

  const handleProcessRowUpdateError = (error: Error): void => {
    console.error(error);
    enqueueSnackbar(error?.message || "Failed to update work order.", {
      variant: "error",
    });
  };

  const handleDeleteClick = (id: GridRowId) => {
    if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) {
      enqueueSnackbar("Invalid work order ID. Delete aborted.", {
        variant: "error",
      });
      return;
    }
    if (!window.confirm(`Are you sure you want to delete work order ${id}?`))
      return;

    deleteWorkOrder.mutate(id, {
      onSuccess: () => {
        enqueueSnackbar(`Work order ${id} deleted successfully.`, {
          variant: "success",
        });
        workOrderList.refetch();
      },
      onError: (error: any) => {
        enqueueSnackbar(error?.message || "Failed to delete work order.", {
          variant: "error",
        });
      },
    });
  };

  const handleNewWorkOrder = (newWorkOrder: NewWorkOrder) => {
    createWorkOrder
      .mutateAsync(newWorkOrder)
      .then(() => workOrderList.refetch());
  };

  const clearFilters = () => {
    setQInput("");
    setSearch((prev) => ({
      ...prev,
      page: 0,
      q: undefined,
      work_order_id: undefined,
      status: [WorkOrderStatus.Open, WorkOrderStatus.Review],
      assigned_user_id: hasAdminScope ? undefined : currentUserId,
    }));
  };

  const columns: GridColDef<any>[] = [
    {
      field: "work_order_id",
      headerName: "ID",
      type: "number",
      flex: 1,
      minWidth: 50,
    },
    {
      field: "date_created",
      headerName: "Date",
      flex: 1,
      minWidth: 100,
      valueGetter: (value) => new Date(value),
      valueFormatter: (value: Date) => value.toLocaleDateString(),
    },
    {
      field: "meter_serial",
      headerName: "Meter",
      flex: 1,
      minWidth: 100,
      renderCell: (params) => {
        return (
          <Link
            to="/manage/meters"
            search={(prev) => ({
              meter_id: params.row.meter_id,
              activity_id: prev.activity_id ?? undefined,
              add: prev.add ?? undefined,
              tab: prev.tab ?? undefined,
              q: prev.q ?? undefined,
              filters: prev.filters ?? undefined,
            })}
          >
            {params.value}
          </Link>
        );
      },
    },
    {
      field: "title",
      headerName: "Title",
      flex: 2,
      minWidth: 200,
      editable: hasAdminScope,
    },
    {
      field: "description",
      headerName: "Description",
      flex: 2,
      minWidth: 300,
      editable: hasAdminScope,
    },
    {
      field: "creator",
      headerName: "Created By",
      flex: 2,
      minWidth: 150,
      editable: hasAdminScope,
    },
    {
      field: "status",
      headerName: "Status",
      flex: 1,
      minWidth: 125,
      type: "singleSelect",
      valueOptions: STATUS_OPTIONS,
      editable: true,
    },
    { field: "notes", headerName: "Notes", width: 300, editable: true },
    {
      field: "associated_activities",
      headerName: "Activity IDs",
      flex: 1,
      minWidth: 150,
      renderCell: (params) => {
        const activities = (params.value as MeterActivity[]) ?? [];
        const links = activities.map((activity, index) => (
          <span key={activity.id}>
            <Link
              to="/manage/meters"
              search={(prev) => ({
                meter_id: activity.meter_id,
                activity_id: activity.id,
                add: prev.add ?? undefined,
                tab: prev.tab ?? undefined,
                q: prev.q ?? undefined,
                filters: prev.filters ?? undefined,
              })}
            >
              {activity.id}
            </Link>
            {index < params.value.length - 1 ? ", " : ""}
          </span>
        ));
        return <>{links}</>;
      },
      editable: false,
    },
    {
      field: "assigned_user_id",
      headerName: "Technician Assigned",
      flex: 2,
      minWidth: 200,
      cellClassName: "work-order-top-cell",
      valueGetter: (id: number) => getUserFromID(id),
      renderCell: (params) => {
        const assignedUser = getUserByID(params.row.assigned_user_id);

        if (!assignedUser) return "";

        return (
          <Stack direction="row" spacing={1} alignItems="center">
            <UserAvatar
              full_name={assignedUser.full_name}
              role={getAvatarRole(assignedUser)}
              src={assignedUser.avatar_img ?? undefined}
              size={34}
            />
            <Box component="span">{assignedUser.full_name}</Box>
          </Stack>
        );
      },
      type: "singleSelect",
      valueOptions: sortedUsers.map((user) => user.full_name),
      editable: hasAdminScope,
    },
    {
      field: "location_name",
      headerName: "Location Name",
      flex: 2,
      minWidth: 200,
      renderCell: (params) => {
        const activities = params.row.associated_activities ?? [];
        return activities.length > 0 ? activities[0].location_name : "";
      },
    },
    {
      field: "water_users",
      headerName: "Water Users",
      flex: 2,
      minWidth: 200,
      renderCell: (params) => {
        const activities = params.row.associated_activities ?? [];
        return activities.length > 0 && activities[0].water_users
          ? activities[0].water_users
          : "";
      },
    },
    {
      field: "actions",
      headerName: "Actions",
      flex: 1,
      minWidth: 100,
      sortable: false,
      cellClassName: "work-order-top-cell",
      renderCell: (params: GridRenderCellParams<any>) => {
        const isOpen = params.row.status === "Open";

        return (
          <Box
            display="flex"
            justifyContent="flex-end"
            alignItems="flex-start"
            width="100%"
            gap={1}
          >
            {isOpen && (
              <Link
                to="/activities"
                search={{
                  meter_id: params.row.meter_id,
                  serial_number: params.row.meter_serial,
                  work_order_id: params.row.work_order_id,
                }}
                style={{ display: "inline-flex" }}
                onMouseDown={(e: any) => e.stopPropagation()}
                onClick={(e: any) => e.stopPropagation()}
              >
                <IconButton
                  color="primary"
                  size="small"
                  aria-label="Edit Activity"
                >
                  <Handyman />
                </IconButton>
              </Link>
            )}
            {hasAdminScope && (
              <IconButton
                color="error"
                size="small"
                aria-label="Delete Work Order"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteClick(params.id);
                }}
              >
                <Delete />
              </IconButton>
            )}
          </Box>
        );
      },
    },
  ];

  const rows = workOrderList.data ?? [];
  const loading = workOrderList.isLoading || workOrderList.isFetching;
  const selectedAssignedUser = assigned_user_id
    ? (sortedUsers.find((u) => u.id === assigned_user_id) ?? null)
    : null;

  return (
    <Box sx={{ width: "100%", overflowX: "auto" }}>
      <Box sx={{ mb: 1.5 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          py={1}
          alignItems="flex-start"
        >
          <Autocomplete
            multiple
            size="small"
            disableCloseOnSelect
            options={STATUS_OPTIONS}
            value={status ?? [WorkOrderStatus.Open, WorkOrderStatus.Review]}
            onChange={(_, value) =>
              setSearch((p) => ({
                ...p,
                status: value.length ? value : [WorkOrderStatus.Open],
                page: 0,
              }))
            }
            sx={{ minWidth: 260 }}
            renderInput={(params) => <TextField {...params} label="Status" />}
          />
          {hasAdminScope && (
            <Autocomplete
              size="small"
              disabled={!hasAdminScope}
              options={sortedUsers}
              groupBy={(option: User) => getRoleLabel(option)}
              getOptionLabel={(option: User) => option.full_name ?? ""}
              isOptionEqualToValue={(option: User, value: User) =>
                option.id === value.id
              }
              value={selectedAssignedUser}
              onChange={(_, user) => {
                const id = user?.id;
                setSearch((p) => ({ ...p, assigned_user_id: id, page: 0 }));
              }}
              sx={{ minWidth: 260 }}
              renderOption={(props, option) => (
                <li {...props} key={option.id}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <UserAvatar
                      full_name={option.full_name}
                      role={getAvatarRole(option)}
                      src={option.avatar_img ?? undefined}
                      size={34}
                    />
                    <Box component="span">{option.full_name}</Box>
                  </Stack>
                </li>
              )}
              renderInput={(params) => {
                const { InputProps, ...rest } = params;
                const startAdornment = selectedAssignedUser ? (
                  <>
                    <UserAvatar
                      full_name={selectedAssignedUser.full_name}
                      role={getAvatarRole(selectedAssignedUser)}
                      src={selectedAssignedUser.avatar_img ?? undefined}
                      size={24}
                      sx={{ mr: 1 }}
                    />
                    {InputProps.startAdornment}
                  </>
                ) : InputProps.startAdornment;

                return (
                  <TextField
                    {...rest}
                    InputProps={{
                      ...InputProps,
                      ...(startAdornment
                        ? { startAdornment }
                        : {}),
                    }}
                    label={
                      hasAdminScope
                        ? "Assigned technician"
                        : "Assigned (admin only)"
                    }
                  />
                );
              }}
            />
          )}
          <TextField
            size="small"
            label="Search"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const next = qInput.trim();
                setSearch((p) => ({ ...p, q: next || undefined, page: 0 }));
              }
            }}
            sx={{ minWidth: 260 }}
            helperText="Press Enter to apply"
          />

          <Stack direction="row" spacing={1} sx={{ ml: "auto" }}>
            <Button
              sx={{
                height: 40,
                minHeight: 40,
              }}
              variant="outlined"
              startIcon={<Clear />}
              onClick={clearFilters}
            >
              Clear
            </Button>
          </Stack>
        </Stack>
      </Box>
      <Box sx={{ height: 600, width: "100%", overflowX: "auto" }}>
        <DataGrid
          sx={{
            "& .work-order-top-cell": {
              alignItems: "flex-start",
              py: 1,
            },
          }}
          rows={rows}
          loading={loading}
          getRowHeight={() => "auto"}
          getRowId={(row) => row.work_order_id}
          columns={columns}
          initialState={{
            pagination: { paginationModel: { page: 0, pageSize: 25 } },
            columns: {
              columnVisibilityModel: {
                work_order_id: false,
                creator: hasAdminScope,
                associated_activities: hasAdminScope,
                assigned_user_id: hasAdminScope,
              },
            },
          }}
          pagination
          pageSizeOptions={[10, 25, 50, 100]}
          paginationModel={{ page, pageSize }}
          onPaginationModelChange={(m) => {
            navigate({
              to: "/workorders",
              search: (prev) => ({
                ...prev,
                pageSize: m.pageSize,
                page: m.pageSize !== prev.pageSize ? 0 : m.page,
              }),
              replace: true,
            });
          }}
          processRowUpdate={handleRowUpdate}
          onProcessRowUpdateError={handleProcessRowUpdateError}
          slots={{ footer: GridFooterWithButton }}
          slotProps={{
            footer: {
              button: hasAdminScope && (
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1}
                  sx={{
                    ml: { xs: 0, sm: 1 },
                    mt: { xs: 1, sm: 0 },
                    width: "100%",
                  }}
                  alignItems={{ xs: "stretch", sm: "center" }}
                >
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => setIsNewWorkOrderModalOpen(true)}
                    sx={{ flexShrink: 0, width: { xs: "100%", sm: "auto" } }}
                    startIcon={<Add fontSize="small" />}
                  >
                    Create
                  </Button>
                </Stack>
              ),
            },
          }}
        />
      </Box>
      <Create
        open={isNewWorkOrderModalOpen}
        onClose={() => setIsNewWorkOrderModalOpen(false)}
        submitNewWorkOrder={handleNewWorkOrder}
      />
    </Box>
  );
};
