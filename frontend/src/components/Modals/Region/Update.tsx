
import { useState } from "react";
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
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import {
  MonitoredWell,
  PatchRegionMeasurement,
} from "../../../interfaces.js";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import dayjs from "dayjs";
dayjs.extend(utc);
dayjs.extend(timezone);
import { DatePicker, TimePicker } from "@mui/x-date-pickers";
import { RadioButtonUnchecked, TaskAlt } from "@mui/icons-material";
import { useGetUserList } from "../../../service/ApiServiceNew";
import { useQuery } from "react-query";
import { useFetchWithAuth } from "../../../hooks/useFetchWithAuth.js";
import { ModalBackgroundBox } from "./../../";


export const UpdateModal = ({
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

  const [notSampled, setNotSampled] = useState<boolean>(false);
  const [previousValue, setPreviousValue] = useState<number | null>(null);

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

  const handleToggleNotSampled = (checked: boolean) => {
    setNotSampled(checked);

    if (checked) {
      // Store previous numeric value and clear backend value
      setPreviousValue(measurement.value ?? null);
      onUpdateMeasurement({ value: null });
    } else {
      // Restore previous numeric value when toggled back
      if (previousValue !== null) {
        onUpdateMeasurement({ value: previousValue });
      }
    }
  };

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
            <FormControlLabel
              value="bottom"
              control={
                <Checkbox
                  size="large"
                  icon={<RadioButtonUnchecked />}
                  checkedIcon={<TaskAlt />}
                  checked={notSampled}
                  onChange={(e) => handleToggleNotSampled(e.target.checked)}
                />
              }
              label="Well was visited but NOT SAMPLED"
              labelPlacement="end"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              required={!notSampled}
              fullWidth
              size={"small"}
              type="number"
              disabled={notSampled}
              value={
                notSampled
                  ? "" // visually empty
                  : measurement.value ?? ""
              }
              label={notSampled ? "NOT SAMPLED" : "Value"}
              onChange={(event) =>
                onUpdateMeasurement({
                  value:
                    event.target.value === ""
                      ? null
                      : Number(event.target.value),
                })
              }
            />
          </Grid>
          <Grid item xs={12}>
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
