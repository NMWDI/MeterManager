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
  NewWellMeasurement,
  PatchWellMeasurement,
  SecurityScope,
} from "../interfaces.js";
import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(timezone);
import { DatePicker, TimePicker } from "@mui/x-date-pickers";
import { useGetUserList } from "../service/ApiServiceNew";

export function NewMeasurementModal({
  isNewMeasurementModalOpen,
  handleCloseNewMeasurementModal,
  handleSubmitNewMeasurement,
}: {
  isNewMeasurementModalOpen: boolean;
  handleCloseNewMeasurementModal: () => void;
  handleSubmitNewMeasurement: (newMeasurement: NewWellMeasurement) => void;
}) {
  const authUser = useAuthUser();
  const hasAdminScope = authUser()
    ?.user_role.security_scopes.map(
      (scope: SecurityScope) => scope.scope_string,
    )
    .includes("admin");

  const userList = useGetUserList();
  const [value, setValue] = useState<number | null>(null);
  const [selectedUserID, setSelectedUserID] = useState<number | string>("");
  const [date, setDate] = useState<Dayjs | null>(dayjs.utc());
  const [time, setTime] = useState<Dayjs | null>(dayjs.utc());

  // Sends user entered information to the parent through callback
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
      timestamp: combinedDateTime.toISOString(),
      value: value as number,
      submitting_user_id: selectedUserID as number,
      well_id: -1, // Set by parent
    });
  }

  function UserSelection() {
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
  }

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
          <Grid container item sx={{ mr: "auto", ml: "auto" }}>
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
}

interface UpdateMeasurementModalProps {
  isMeasurementModalOpen: boolean;
  handleCloseMeasurementModal: () => void;
  measurement: PatchWellMeasurement;
  onUpdateMeasurement: (value: Partial<PatchWellMeasurement>) => void;
  onSubmitUpdate: () => void;
  onDeleteMeasurement: () => void;
}

export function UpdateMeasurementModal({
  isMeasurementModalOpen,
  handleCloseMeasurementModal,
  measurement,
  onUpdateMeasurement,
  onSubmitUpdate,
  onDeleteMeasurement,
}: UpdateMeasurementModalProps) {
  const userList = useGetUserList();

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
          <Grid container item sx={{ mr: "auto", ml: "auto" }}>
            <Button
              sx={{ mr: "5px" }}
              type="submit"
              variant="contained"
              onClick={onSubmitUpdate}
            >
              Update
            </Button>
            <Button
              type="button"
              variant="contained"
              onClick={onDeleteMeasurement}
            >
              Delete
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Modal>
  );
}
