import { useEffect, useState } from "react";
import DeletedIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import HandymanIcon from "@mui/icons-material/Handyman";
import {
  DataGrid,
  GridColDef,
  GridRowModel,
  GridActionsCellItem,
  GridActionsCellItemProps,
  GridRenderCellParams,
  GridRowId,
  GridFilterItem,
} from "@mui/x-data-grid";
import {
  useGetWorkOrders,
  useUpdateWorkOrder,
  useGetUserList,
  useDeleteWorkOrder,
  useCreateWorkOrder,
} from "../../service/ApiServiceNew";
import { WorkOrderStatus } from "../../enums";
import MeterSelection from "../../components/MeterSelection";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
} from "@mui/material";
import GridFooterWithButton from "../../components/GridFooterWithButton";
import {
  MeterActivity,
  MeterListDTO,
  NewWorkOrder,
  SecurityScope,
} from "../../interfaces";
import { useAuthUser } from "react-auth-kit";
import { Link, createSearchParams } from "react-router-dom";

function DeleteWorkOrder({
  deleteUser,
  deleteMessage,
  ...props
}: GridActionsCellItemProps & {
  deleteUser: () => void;
  deleteMessage?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <GridActionsCellItem {...props} onClick={() => setOpen(true)} />
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{deleteMessage}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={() => {
              setOpen(false);
              deleteUser();
            }}
            color="warning"
            autoFocus
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

interface NewWorkOrderModalProps {
  openNewWorkOrderModal: boolean;
  closeNewWorkOrderModal: () => void;
  submitNewWorkOrder: (newWorkOrder: NewWorkOrder) => void;
}

function NewWorkOrderModal({
  openNewWorkOrderModal,
  closeNewWorkOrderModal,
  submitNewWorkOrder,
}: NewWorkOrderModalProps) {
  const [workOrderTitle, setWorkOrderTitle] = useState<string>("");
  const [workOrderMeter, setWorkOrderMeter] = useState<
    MeterListDTO | undefined
  >();
  const [meterSelectionError, setMeterSelectionError] =
    useState<boolean>(false);
  const [titleError, setTitleError] = useState<boolean>(false);

  function handleSubmit() {
    if (!workOrderMeter) {
      setMeterSelectionError(true);
      return;
    }
    if (!workOrderTitle) {
      setTitleError(true);
      return;
    }

    //If both fields are filled, submit the work order
    //Create a new work order object
    const newWorkOrder: NewWorkOrder = {
      date_created: new Date(),
      meter_id: workOrderMeter.id,
      title: workOrderTitle,
    };
    submitNewWorkOrder(newWorkOrder);
    closeNewWorkOrderModal();

    //Reset the form
    setWorkOrderMeter(undefined);
    setWorkOrderTitle("");
  }

  const handleCancel = () => {
    closeNewWorkOrderModal();
    setWorkOrderMeter(undefined);
    setWorkOrderTitle("");
  };

  return (
    <Dialog open={openNewWorkOrderModal} onClose={closeNewWorkOrderModal}>
      <DialogTitle>Create a New Work Order</DialogTitle>
      <DialogContent>
        <DialogContentText>
          To create a new work order, please select a meter and title. Other
          fields can be edited as needed after creation.
        </DialogContentText>
        <MeterSelection
          selectedMeter={workOrderMeter}
          onMeterChange={setWorkOrderMeter}
          error={meterSelectionError}
        />
        <TextField
          autoFocus
          margin="dense"
          id="title"
          label="Title"
          type="text"
          fullWidth
          value={workOrderTitle}
          onChange={(event: any) => setWorkOrderTitle(event.target.value)}
          error={titleError}
          helperText={titleError ? "Title cannot be empty" : ""}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel}>Cancel</Button>
        <Button onClick={handleSubmit}>Submit</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function WorkOrdersTable() {
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
      flex: 1,
      minWidth: 50
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
            to={{
              pathname: "/meters",
              search: `?meter_id=${params.row.meter_id}`,
            }}
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
              to={{
                pathname: "/meters",
                search: `?meter_id=${activity.meter_id}&activity_id=${activity.id}`,
              }}
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
                component={Link}
                to={
                  "/activities?" +
                  createSearchParams({
                    meter_id: params.row.meter_id,
                    serial_number: params.row.meter_serial,
                    work_order_id: params.row.work_order_id,
                  }).toString()
                }
                aria-label="Edit Activity"
              >
                <HandymanIcon />
              </IconButton>
            )}
            <DeleteWorkOrder
              icon={<DeletedIcon />}
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
    <Box sx={{ height: 700, width: "100%", overflowX: 'auto' }}>
      <DataGrid
        rows={workOrderList.data ?? []}
        getRowHeight={() => "auto"}
        getRowId={(row) => row.work_order_id}
        columns={columns}
        disableColumnResize={false}
        initialState={{
          columns: {
            columnVisibilityModel: {
              work_order_id: false,
              creator: hasAdminScope,
              associated_activities: hasAdminScope,
              assigned_user_id: hasAdminScope,
            },
          },
          filter: { filterModel: { items: initialFilter } },
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
                sx={{ ml: { xs: 0, sm: 1 }, mt: { xs: 1, sm: 0 }, width: "100%" }}
                alignItems={{ xs: "stretch", sm: "center" }}
              >
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => setIsNewWorkOrderModalOpen(true)}
                  sx={{ flexShrink: 0, width: { xs: "100%", sm: "auto" } }}
                >
                  <AddIcon fontSize="small" sx={{ mr: 0.5 }} />
                  Create
                </Button>
              </Stack>
            ),
          },
        }}
      />
      <NewWorkOrderModal
        openNewWorkOrderModal={isNewWorkOrderModalOpen}
        closeNewWorkOrderModal={() => setIsNewWorkOrderModalOpen(false)}
        submitNewWorkOrder={handleNewWorkOrder}
      />
    </Box>
  );
}
