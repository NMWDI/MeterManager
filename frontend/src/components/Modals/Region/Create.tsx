import {
  Modal,
  TextField,
  Button,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Grid,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { useAuthUser } from "react-auth-kit";
import {
  MonitoredWell,
  NewRegionMeasurement,
  SecurityScope,
} from "../../../interfaces.js";
import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(timezone);
import { DatePicker, TimePicker } from "@mui/x-date-pickers";
import { useGetUserList } from "../../../service/ApiServiceNew";
import { useQuery } from "react-query";
import { useFetchWithAuth } from "../../../hooks/useFetchWithAuth.js";
import { ModalBackgroundBox } from "./../../";

export const CreateModal = ({
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
    // default fallback: now
    const selectedDate = date ?? dayjs();
    const selectedTime = time ?? dayjs();

    // merge date + time into one object
    const combinedDateTime = selectedDate
      .hour(selectedTime.hour())
      .minute(selectedTime.minute())
      .second(selectedTime.second());

    handleSubmitNewMeasurement({
      region_id: 0, // Set by parent
      well_id: selectedWellID as number,
      timestamp: combinedDateTime.toISOString(),
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
      <ModalBackgroundBox>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Typography variant="h4" fontWeight="bold" pb={2} textAlign="center">Create New Measurement</Typography>
          </Grid>
          <Grid item xs={12}>
            <UserSelection />
          </Grid>
          <Grid item xs={12}>
            <DatePicker
              label="Date"
              value={date}
              onChange={setDate}
              slotProps={{
                textField: { size: "small", fullWidth: true, required: true },
              }}
            />
          </Grid>
          <Grid item xs={12}>
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
          <Grid item xs={12}>
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
          <Grid item xs={12}>
            <WellSelection region_id={region_id} />
          </Grid>
          <Grid
            item
            xs={12}
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
      </ModalBackgroundBox>
    </Modal>
  );
};
