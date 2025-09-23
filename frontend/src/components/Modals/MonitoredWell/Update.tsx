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
import {
  PatchWellMeasurement,
} from "../../../interfaces.js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(timezone);
import { DatePicker, TimePicker } from "@mui/x-date-pickers";
import { useGetUserList } from "../../../service/ApiServiceNew";
import { ModalBackgroundBox } from "./../../";

export function UpdateModal({
  isMeasurementModalOpen,
  handleCloseMeasurementModal,
  measurement,
  onUpdateMeasurement,
  onSubmitUpdate,
  onDeleteMeasurement,
}: {
  isMeasurementModalOpen: boolean;
  handleCloseMeasurementModal: () => void;
  measurement: PatchWellMeasurement;
  onUpdateMeasurement: (value: Partial<PatchWellMeasurement>) => void;
  onSubmitUpdate: () => void;
  onDeleteMeasurement: () => void;
}) {
  const userList = useGetUserList();

  return (
    <Modal open={isMeasurementModalOpen} onClose={handleCloseMeasurementModal}>
      <ModalBackgroundBox>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Typography variant="h4" fontWeight="bold" pb={2} textAlign="center">Update Measurement</Typography>
          </Grid>
          <Grid item xs={12}>
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
          <Grid item xs={12}>
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
          <Grid item xs={12}>
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
          <Grid item xs={12}>
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
          <Grid
            item
            xs={12}
            sx={{
              mr: "auto",
              ml: "auto",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <Button
              type="button"
              variant="outlined"
              color="error"
              onClick={onDeleteMeasurement}
            >
              Delete
            </Button>
            <Button
              type="submit"
              variant="contained"
              onClick={onSubmitUpdate}
            >
              Update
            </Button>
          </Grid>
        </Grid>
      </ModalBackgroundBox>
    </Modal>
  );
}
