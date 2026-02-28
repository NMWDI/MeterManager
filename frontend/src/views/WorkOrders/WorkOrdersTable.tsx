import { useEffect, useMemo, useState } from "react";
import { Delete, Add, Handyman } from "@mui/icons-material";
import {
  DataGrid,
  GridColDef,
  GridRowModel,
  GridRenderCellParams,
  GridRowId,
  GridFilterItem,
} from "@mui/x-data-grid";
import { useAuthUser } from "react-auth-kit";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import {
  useGetWorkOrders,
  useUpdateWorkOrder,
  useGetUserList,
  useDeleteWorkOrder,
  useCreateWorkOrder,
} from "@/service/ApiServiceNew";
import { WorkOrderStatus } from "@/enums";
import { Box, Button, IconButton, Stack } from "@mui/material";
import { GridFooterWithButton } from "@/components";
import { MeterActivity, NewWorkOrder, SecurityScope } from "@/interfaces";
import { DeleteWorkOrder } from "./DeleteWorkOrder";
import { NewWorkOrderModal } from "./NewWorkOrderModal";

export default function WorkOrdersTable() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/workorders" });

  const workOrderIdFilter = useMemo(() => {
    return search.work_order_id?.length ? search.work_order_id : null;
  }, [search.work_order_id]);

  const [workOrderFilters, setWorkOrderFilters] = useState<WorkOrderStatus[]>([
    WorkOrderStatus.Open,
    WorkOrderStatus.Review,
  ]);
  const workOrderList = useGetWorkOrders(workOrderFilters, {
    refetchInterval: false,
  });
  const updateWorkOrder = useUpdateWorkOrder();
  const deleteWorkOrder = useDeleteWorkOrder(() =>
    console.log("Work order deleted"),
  );
  const createWorkOrder = useCreateWorkOrder();
  const userList = useGetUserList();

  const [isNewWorkOrderModalOpen, setIsNewWorkOrderModalOpen] =
    useState<boolean>(false);

  const displayedRows = useMemo(() => {
    const rows = workOrderList.data ?? [];
    if (!workOrderIdFilter) return rows;
    const set = new Set(workOrderIdFilter);
    return rows.filter((r: any) => set.has(r.work_order_id));
  }, [workOrderList.data, workOrderIdFilter]);

  //Current user needed for various changes to UI based on user role
  const authUser = useAuthUser();
  const hasAdminScope = authUser()
    ?.user_role.security_scopes.map(
      (scope: SecurityScope) => scope.scope_string,
    )
    .includes("admin");

  const getUserFromID = (id: number | undefined) => {
    return userList.data?.find((user) => user.id === id)?.full_name ?? "";
  };

  const getUserIDfromName = (name: string) => {
    return userList.data?.find((user) => user.full_name === name)?.id ?? 0;
  };

  const current_user_name = getUserFromID(authUser()?.id);
  var initialFilter: GridFilterItem[] = []; //No filter if admin
  var status_options = ["Open", "Review", "Closed"];

  //Change a few defaults depending on if admin or not
  if (!hasAdminScope) {
    initialFilter = [
      { field: "assigned_user_id", operator: "is", value: current_user_name },
    ];
    status_options = ["Open", "Review"];
  } else {
    //Filter by Status
    //Unlike with the technicians, this filters on the frontend in case the admin wants to see all work orders
    initialFilter = [{ field: "status", operator: "not", value: "Closed" }];
  }

  //Update list of work orders if technician level to only show open and review.
  //useEffect prevents this from running on every render
  useEffect(() => {
    if (hasAdminScope) {
      setWorkOrderFilters([
        WorkOrderStatus.Open,
        WorkOrderStatus.Review,
        WorkOrderStatus.Closed,
      ]);
    } else {
      setWorkOrderFilters([WorkOrderStatus.Open, WorkOrderStatus.Review]);
    }
  }, [hasAdminScope]); // Dependency array ensures this runs only when hasAdminScope changes

  const handleRowUpdate = (
    updatedRow: GridRowModel,
    originalRow: GridRowModel,
  ): Promise<GridRowModel> => {
    //Determine what field has changed and update the work order
    const updatedField = Object.keys(updatedRow).find(
      (key) => updatedRow[key] !== originalRow[key],
    );
    let field_data = null;

    //If field is assigned_user_id, convert the name to an id
    if (updatedField === "assigned_user_id") {
      field_data = getUserIDfromName(updatedRow.assigned_user_id as string);
    } else {
      field_data = updatedRow[updatedField as string];
    }

    const work_order_update = {
      work_order_id: updatedRow.work_order_id,
      [updatedField as string]: field_data,
    };

    //Create a promise to update the work order
    return updateWorkOrder.mutateAsync(work_order_update);
  };

  const handleProcessRowUpdateError = (error: Error): void => {
    console.error("Error updating work order", error);
  };

  const handleDeleteClick = (id: GridRowId) => {
    let deletepromise = deleteWorkOrder.mutateAsync(id as number);
    deletepromise.then(() => {
      //Get the updated rows
      workOrderList.refetch();
    });
  };

  const handleNewWorkOrder = (newWorkOrder: NewWorkOrder) => {
    createWorkOrder.mutateAsync(newWorkOrder).then(() => {
      workOrderList.refetch();
    });
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
      valueOptions: status_options,
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
      valueGetter: (id: number) => getUserFromID(id),
      type: "singleSelect",
      valueOptions: userList.data?.map((user) => user.full_name) ?? [],
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
      renderCell: (params: GridRenderCellParams<any>) => {
        const isOpen = params.row.status === "Open";

        return (
          <Box
            display="flex"
            justifyContent="flex-end"
            alignItems="center"
            width="100%"
            height="100%"
            gap={1}
          >
            {isOpen && (
              <IconButton
                color="primary"
                size="small"
                aria-label="Edit Activity"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate({ to: `/manage/parts/${params.row.id}/history` });
                }}
              >
                <Handyman />
              </IconButton>
            )}
            <DeleteWorkOrder
              icon={<Delete />}
              deleteMessage={`Delete work order ${params.id}?`}
              label="Delete"
              deleteUser={() => handleDeleteClick(params.id)}
              showInMenu={false}
              disabled={!hasAdminScope}
            />
          </Box>
        );
      },
    },
  ];

  return (
    <Box sx={{ height: 700, width: "100%", overflowX: "auto" }}>
      <DataGrid
        key={
          workOrderIdFilter?.length
            ? `woids-${workOrderIdFilter.join(",")}`
            : `default-${hasAdminScope ? "admin" : "tech"}`
        }
        rows={displayedRows ?? []}
        getRowHeight={() => "auto"}
        getRowId={(row) => row.work_order_id}
        columns={columns}
        disableColumnResize={false}
        filterModel={workOrderIdFilter?.length ? { items: [] } : undefined}
        initialState={{
          columns: {
            columnVisibilityModel: {
              work_order_id: false,
              creator: hasAdminScope,
              associated_activities: hasAdminScope,
              assigned_user_id: hasAdminScope,
            },
          },
          ...(workOrderIdFilter?.length
            ? {} // NO default filter when URL param exists
            : { filter: { filterModel: { items: initialFilter } } }),
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
      <NewWorkOrderModal
        open={isNewWorkOrderModalOpen}
        onClose={() => setIsNewWorkOrderModalOpen(false)}
        submitNewWorkOrder={handleNewWorkOrder}
      />
    </Box>
  );
}
