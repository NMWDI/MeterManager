import {
  Dialog,
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
} from "@mui/material";
import { Save, Delete } from "@mui/icons-material";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(timezone);

import { DatePicker, TimePicker } from "@mui/x-date-pickers";
import { useGetUserList } from "@/service/ApiServiceNew";
import { PatchWellMeasurement } from "@/interfaces.js";

export function UpdateModal({
  open,
  onClose,
  measurement,
  onUpdateMeasurement,
  onSubmitUpdate,
  onDeleteMeasurement,
}: {
  open: boolean;
  onClose: () => void;
  measurement: PatchWellMeasurement;
  onUpdateMeasurement: (value: Partial<PatchWellMeasurement>) => void;
  onSubmitUpdate: () => void;
  onDeleteMeasurement: () => void;
}) {
  const userList = useGetUserList();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby="update-measurement-title"
      aria-describedby="update-measurement-description"
    >
      <DialogTitle id="update-measurement-title">
        Update Measurement
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography
            id="update-measurement-description"
            variant="body2"
            color="text.secondary"
          >
            Update the measurement details below. Adjust date/time as needed,
            then click Update to save changes.
          </Typography>

          <FormControl size="small" fullWidth required>
            <InputLabel>User</InputLabel>
            <Select
              value={
                userList.isLoading ? "loading" : measurement.submitting_user_id
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
        <Button
          type="button"
          variant="outlined"
          color="error"
          onClick={onDeleteMeasurement}
          startIcon={<Delete fontSize="small" />}
        >
          Delete
        </Button>
        <Button
          type="submit"
          variant="contained"
          color="success"
          onClick={onSubmitUpdate}
          startIcon={<Save fontSize="small" />}
        >
          Update
        </Button>
      </DialogActions>
    </Dialog>
  );
}
