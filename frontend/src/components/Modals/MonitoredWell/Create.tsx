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
  NewWellMeasurement,
  SecurityScope,
} from "../../../interfaces.js";
import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(timezone);
import { DatePicker, TimePicker } from "@mui/x-date-pickers";
import { useGetUserList } from "../../../service/ApiServiceNew";
import { ModalBackgroundBox } from "../../ModalBackgroundBox.js";

export function CreateModal({
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

  // If user has the admin scope, show them a user selection, if not set the user ID to the current user's
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
}
