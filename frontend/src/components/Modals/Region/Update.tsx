import { useEffect, useState } from "react";
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
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import dayjs from "dayjs";
dayjs.extend(utc);
dayjs.extend(timezone);

import { DatePicker, TimePicker } from "@mui/x-date-pickers";
import {
  RadioButtonUnchecked,
  TaskAlt,
  Delete,
  Save,
} from "@mui/icons-material";
import { useGetUserList } from "@/service";
import { useQuery } from "react-query";
import { useFetchWithAuth } from "@/hooks";
import { MonitoredWell, PatchRegionMeasurement } from "@/interfaces";

export const UpdateModal = ({
  region_id,
  open,
  onClose,
  measurement,
  onUpdateMeasurement,
  onSubmitUpdate,
  onDeleteMeasurement,
  title = "Update Measurement",
}: {
  region_id?: number;
  open: boolean;
  onClose: () => void;
  measurement: Partial<PatchRegionMeasurement>;
  onUpdateMeasurement: (value: Partial<PatchRegionMeasurement>) => void;
  onSubmitUpdate: () => void;
  onDeleteMeasurement: () => void;
  title?: string;
}) => {
  const regionId = region_id;

  const userList = useGetUserList();
  const fetchWithAuth = useFetchWithAuth();

  const [notSampled, setNotSampled] = useState<boolean>(
    measurement.value === undefined || measurement.value === null,
  );
  const [previousValue, setPreviousValue] = useState<number | null>(null);

  const { data: wells, isLoading: isLoadingWells } = useQuery<
    { items: MonitoredWell[] },
    Error,
    MonitoredWell[]
  >({
    queryKey: ["wells", "has_chloride_groups", regionId],
    queryFn: () =>
      fetchWithAuth({
        method: "GET",
        route: "/wells",
        params: {
          sort_by: "ra_number",
          sort_direction: "asc",
          has_chloride_group: true,
          chloride_group_id: regionId,
          limit: 100,
        },
      }),
    enabled: open && !!regionId,
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

  useEffect(() => {
    setNotSampled(measurement.value == null);
  }, [measurement.value]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby="update-region-measurement-title"
      aria-describedby="update-region-measurement-description"
    >
      <DialogTitle id="update-region-measurement-title">{title}</DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography
            id="update-region-measurement-description"
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

          <TextField
            required={!notSampled}
            fullWidth
            size={"small"}
            type="number"
            disabled={notSampled}
            value={
              notSampled
                ? "" // visually empty
                : (measurement.value ?? "")
            }
            label={notSampled ? "NOT SAMPLED" : "Value"}
            onChange={(event) =>
              onUpdateMeasurement({
                value:
                  event.target.value === "" ? null : Number(event.target.value),
              })
            }
          />

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
                ?.filter(
                  (well: MonitoredWell) => well.chloride_group_id === regionId,
                )
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
};
