import {
  Box,
  Modal,
  TextField,
  Button,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Grid,
} from "@mui/material";
import { useState } from "react";
import { useAuthUser } from "react-auth-kit";
import {
  MonitoredWell,
  NewRegionMeasurement,
  PatchRegionMeasurement,
  SecurityScope,
} from "../interfaces.js";
import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(timezone);
import { DatePicker, TimePicker } from "@mui/x-date-pickers";
import { useGetUserList } from "../service/ApiServiceNew";
import { useQuery } from "react-query";
import { useFetchWithAuth } from "../hooks/useFetchWithAuth.js";

export const NewMeasurementModal = ({
  region_id, //Used to filter wells
  isNewMeasurementModalOpen,
  handleCloseNewMeasurementModal,
  handleSubmitNewMeasurement,
}: {
  region_id: number; //Used to filter wells
  isNewMeasurementModalOpen: boolean;
  handleCloseNewMeasurementModal: () => void;
  handleSubmitNewMeasurement: (newMeasurement: NewRegionMeasurement) => void;
}) => {
  const authUser = useAuthUser();
  const hasAdminScope = authUser()
    ?.user_role.security_scopes.map(
      (scope: SecurityScope) => scope.scope_string,
    )
    .includes("admin");

  const fetchWithAuth = useFetchWithAuth();
  const { data: wells, isLoading: isLoadingWells } = useQuery<
    { items: MonitoredWell[] },
    Error,
    MonitoredWell[]
  >({
    queryKey: ["wells", "has_chloride_groups", region_id],
    queryFn: () =>
      fetchWithAuth({
        method: "GET",
        route: "/wells",
        params: {
          sort_by: "ra_number",
          sort_direction: "asc",
          has_chloride_group: true,
          chloride_group_id: region_id,
          limit: 100,
        },
      }),
    enabled: isNewMeasurementModalOpen,
    select: (res) => res.items,
  });

  const userList = useGetUserList();
  const [value, setValue] = useState<number | null>(null);
  const [selectedUserID, setSelectedUserID] = useState<number | string>("");
  const [selectedWellID, setSelectedWellID] = useState<number | string>("");
  const [date, setDate] = useState<Dayjs | null>(dayjs.utc());
  const [time, setTime] = useState<Dayjs | null>(dayjs.utc());

  function onMeasurementSubmitted() {
    const d = new Date(
      Date.parse(date?.format() ?? Date()),
    ).toLocaleDateString();
    const t = new Date(
      Date.parse(time?.format() ?? Date()),
    ).toLocaleTimeString();

    handleSubmitNewMeasurement({
      region_id: 0, // Set by parent
      well_id: selectedWellID as number,
      timestamp: new Date(Date.parse(d + " " + t)),
      value: value as number,
      submitting_user_id: selectedUserID as number,
    });
  }

  const UserSelection = () => {
    if (hasAdminScope) {
      return (
        <FormControl size="small" fullWidth required>
          <InputLabel>User</InputLabel>
          <Select
            value={userList.isLoading ? "loading" : selectedUserID}
            onChange={(event: any) => setSelectedUserID(event.target.value)}
            label="User"
          >
            {userList.data?.map((user: any) => (
              <MenuItem key={user.id} value={user.id}>
                {user.full_name}
              </MenuItem>
            ))}
            {userList.isLoading && (
              <MenuItem value={"loading"} hidden>
                Loading...
              </MenuItem>
            )}
          </Select>
        </FormControl>
      );
    } else {
      setSelectedUserID(authUser()?.id);
      return null;
    }
  };

  const WellSelection = ({ region_id }: { region_id: number }) => {
    return (
      <FormControl size="small" fullWidth required>
        <InputLabel>Well</InputLabel>
        <Select
          value={isLoadingWells ? "loading" : selectedWellID}
          onChange={(event: any) => setSelectedWellID(event.target.value)}
          label="Well"
        >
          {wells
            ?.filter((well: MonitoredWell) => well.chloride_group_id === region_id)
            .map((well: MonitoredWell) => (
              <MenuItem key={well.id} value={well.id}>
                {well.ra_number}
              </MenuItem>
            ))}
          {isLoadingWells && (
            <MenuItem value={"loading"} hidden>
              Loading...
            </MenuItem>
          )}
        </Select>
      </FormControl>
    );
  };

  return (
    <Modal
      open={isNewMeasurementModalOpen}
      onClose={handleCloseNewMeasurementModal}
    >
      <Box
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          backgroundColor: "white",
          paddingRight: 20,
          paddingBottom: 20,
          boxShadow: "24",
          borderRadius: 15,
          paddingLeft: 25,
        }}
      >
        <Grid item xs={"auto"}>
          <h1>Record a New Measurement</h1>
          <Grid container item sx={{ mr: "auto", ml: "auto", mb: 2 }}>
            <UserSelection />
          </Grid>
          <Grid container item sx={{ mr: "auto", ml: "auto", mb: 2 }}>
            <DatePicker
              label="Date"
              value={date}
              onChange={setDate}
              slotProps={{
                textField: { size: "small", fullWidth: true, required: true },
              }}
            />
          </Grid>
          <Grid container item sx={{ mr: "auto", ml: "auto", mb: 2 }}>
            <TimePicker
              label="Time"
              timezone="America/Denver"
              slotProps={{
                textField: { size: "small", fullWidth: true, required: true },
              }}
              value={time}
              onChange={setTime}
            />
          </Grid>
          <Grid container item sx={{ mr: "auto", ml: "auto", mb: 2 }}>
            <TextField
              required
              fullWidth
              size={"small"}
              type="number"
              value={value}
              label="Value"
              onChange={(event) =>
                setValue(event.target.value as unknown as number)
              }
            />
          </Grid>
          <Grid container item sx={{ mr: "auto", ml: "auto", mb: 2 }}>
            <WellSelection region_id={region_id} />
          </Grid>
          <Grid
            container
            item
            sx={{
              mr: "auto",
              ml: "auto",
              display: "flex",
              justifyContent: "right",
            }}
          >
            <Button
              type="submit"
              variant="contained"
              onClick={onMeasurementSubmitted}
            >
              Submit
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Modal>
  );
};

export const UpdateMeasurementModal = ({
  region_id, //Used to filter wells
  isMeasurementModalOpen,
  handleCloseMeasurementModal,
  measurement,
  onUpdateMeasurement,
  onSubmitUpdate,
  onDeleteMeasurement,
}: {
  region_id: number; //Used to filter wells
  isMeasurementModalOpen: boolean;
  handleCloseMeasurementModal: () => void;
  measurement: PatchRegionMeasurement;
  onUpdateMeasurement: (value: Partial<PatchRegionMeasurement>) => void;
  onSubmitUpdate: () => void;
  onDeleteMeasurement: () => void;
}) => {
  const userList = useGetUserList();
  const fetchWithAuth = useFetchWithAuth();
  const { data: wells, isLoading: isLoadingWells } = useQuery<
    { items: MonitoredWell[] },
    Error,
    MonitoredWell[]
  >({
    queryKey: ["wells", "has_chloride_groups", region_id],
    queryFn: () =>
      fetchWithAuth({
        method: "GET",
        route: "/wells",
        params: {
          sort_by: "ra_number",
          sort_direction: "asc",
          has_chloride_group: true,
          chloride_group_id: region_id,
          limit: 100,
        },
      }),
    enabled: isMeasurementModalOpen,
    select: (res) => res.items,
  });

  return (
    <Modal open={isMeasurementModalOpen} onClose={handleCloseMeasurementModal}>
      <Box
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          backgroundColor: "white",
          paddingRight: 20,
          paddingBottom: 20,
          boxShadow: "24",
          borderRadius: 15,
          paddingLeft: 25,
        }}
      >
        <Grid item xs={"auto"}>
          <h2>Update Measurement</h2>
          <Grid container item sx={{ mr: "auto", ml: "auto", mb: 2 }}>
            <FormControl size="small" fullWidth required>
              <InputLabel>User</InputLabel>
              <Select
                value={
                  userList.isLoading
                    ? "loading"
                    : measurement.submitting_user_id
                }
                onChange={(event: any) =>
                  onUpdateMeasurement({
                    submitting_user_id: event.target.value,
                  })
                }
                label="User"
              >
                {userList.data?.map((user: any) => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.full_name}
                  </MenuItem>
                ))}
                {userList.isLoading && (
                  <MenuItem value={"loading"} hidden>
                    Loading...
                  </MenuItem>
                )}
              </Select>
            </FormControl>
          </Grid>
          <Grid container item sx={{ mr: "auto", ml: "auto", mb: 2 }}>
            <DatePicker
              label="Date"
              value={measurement.timestamp}
              onChange={(dateval) =>
                dateval ? onUpdateMeasurement({ timestamp: dateval }) : null
              }
              slotProps={{
                textField: { size: "small", fullWidth: true, required: true },
              }}
            />
          </Grid>
          <Grid container item sx={{ mr: "auto", ml: "auto", mb: 2 }}>
            <TimePicker
              label="Time"
              timezone="America/Denver"
              slotProps={{
                textField: { size: "small", fullWidth: true, required: true },
              }}
              value={measurement.timestamp}
              onChange={(dateval) =>
                dateval ? onUpdateMeasurement({ timestamp: dateval }) : null
              }
            />
          </Grid>
          <Grid container item sx={{ mr: "auto", ml: "auto", mb: 2 }}>
            <TextField
              required
              fullWidth
              size={"small"}
              type="number"
              value={measurement.value}
              label="Value"
              onChange={(event) =>
                onUpdateMeasurement({
                  value: event.target.value as unknown as number,
                })
              }
            />
          </Grid>
          <Grid container item sx={{ mr: "auto", ml: "auto", mb: 2 }}>
            <FormControl size="small" fullWidth required>
              <InputLabel>Well</InputLabel>
              <Select
                value={isLoadingWells ? "loading" : measurement.well_id}
                onChange={(event: any) =>
                  onUpdateMeasurement({
                    well_id: event.target.value,
                  })
                }
                label="Well"
              >
                {wells
                  ?.filter((well: MonitoredWell) => well.chloride_group_id === region_id)
                  .map((well: MonitoredWell) => (
                    <MenuItem key={well.id} value={well.id}>
                      {well.ra_number}
                    </MenuItem>
                  ))}
                {isLoadingWells && (
                  <MenuItem value={"loading"} hidden>
                    Loading...
                  </MenuItem>
                )}
              </Select>
            </FormControl>
          </Grid>
          <Grid
            container
            item
            sx={{
              mr: "auto",
              ml: "auto",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <Button
              type="button"
              variant="text"
              color="error"
              onClick={onDeleteMeasurement}
            >
              Delete
            </Button>
            <Button
              sx={{ mr: "5px" }}
              type="submit"
              variant="contained"
              onClick={onSubmitUpdate}
            >
              Update
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Modal>
  );
};
