import { useEffect, useState } from "react";
import {
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Button,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Typography,
  Stack,
  Dialog,
} from "@mui/material";
import { useAuthUser } from "react-auth-kit";
import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(timezone);

import { DatePicker, TimePicker } from "@mui/x-date-pickers";
import { NewWellMeasurement, SecurityScope } from "@/interfaces";
import { useGetUserList } from "@/service";
import { Save } from "@mui/icons-material";

export const CreateModal = ({
  open,
  onClose,
  handleSubmitNewMeasurement,
  title = "Create New Measurement",
}: {
  open: boolean;
  onClose: () => void;
  handleSubmitNewMeasurement: (newMeasurement: NewWellMeasurement) => void;
  title?: string;
}) => {
  const authUser = useAuthUser();
  const userList = useGetUserList();

  const hasAdminScope = authUser()
    ?.user_role.security_scopes.map(
      (scope: SecurityScope) => scope.scope_string,
    )
    .includes("admin");

  const [valueRaw, setValueRaw] = useState<string>("");
  const [selectedUserID, setSelectedUserID] = useState<number | null>(null);
  const [date, setDate] = useState<Dayjs | null>(dayjs.utc());
  const [time, setTime] = useState<Dayjs | null>(dayjs.utc());

  useEffect(() => {
    if (!open) return;

    if (!hasAdminScope) {
      const id = authUser()?.id;
      setSelectedUserID(typeof id === "number" ? id : Number(id));
    } else {
      setSelectedUserID(null);
    }
  }, [open, hasAdminScope]);

  const valueNum = valueRaw === "" ? NaN : Number(valueRaw);
  const hasValue = Number.isFinite(valueNum);

  const canSave =
    selectedUserID != null &&
    Number.isFinite(selectedUserID) &&
    selectedUserID > 0 &&
    date != null &&
    date.isValid() &&
    time != null &&
    time.isValid() &&
    hasValue;

  function onMeasurementSubmitted() {
    if (!canSave) return;

    const selectedDate = date ?? dayjs();
    const selectedTime = time ?? dayjs();

    const combinedDateTime = selectedDate
      .hour(selectedTime.hour())
      .minute(selectedTime.minute())
      .second(selectedTime.second());

    handleSubmitNewMeasurement({
      timestamp: combinedDateTime.toISOString(),
      value: valueNum,
      submitting_user_id: selectedUserID,
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
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby="create-measurement-title"
      aria-describedby="create-measurement-description"
    >
      <DialogTitle id="create-measurement-title">{title}</DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography
            id="create-measurement-description"
            variant="body2"
            color="text.secondary"
          >
            Enter the measurement details below. Date and time default to the
            current moment and can be adjusted if needed.
          </Typography>

          <UserSelection />

          <DatePicker
            label="Date"
            value={date}
            onChange={setDate}
            slotProps={{
              textField: { size: "small", fullWidth: true, required: true },
            }}
          />

          <TimePicker
            label="Time"
            timezone="America/Denver"
            slotProps={{
              textField: { size: "small", fullWidth: true, required: true },
            }}
            value={time}
            onChange={setTime}
          />

          <TextField
            required
            fullWidth
            size={"small"}
            type="number"
            value={valueRaw}
            label="Value"
            onChange={(e) => setValueRaw(e.target.value)}
            error={valueRaw !== "" && !Number.isFinite(valueNum)}
            helperText={
              valueRaw !== "" && !Number.isFinite(valueNum)
                ? "Enter a valid number."
                : " "
            }
          />
        </Stack>
      </DialogContent>

      <DialogActions
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 3,
          py: 2,
        }}
      >
        <Button onClick={onClose} variant="text">
          Cancel
        </Button>
        <Button
          onClick={onMeasurementSubmitted}
          type="submit"
          variant="contained"
          color="success"
          sx={{
            flexShrink: 0,
            width: { xs: "100%", sm: "auto" },
          }}
          disabled={!canSave}
          startIcon={<Save fontSize="small" />}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};
