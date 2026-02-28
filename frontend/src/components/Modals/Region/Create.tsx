import { useState } from "react";
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
import { RadioButtonUnchecked, TaskAlt, Save } from "@mui/icons-material";
import { DatePicker, TimePicker } from "@mui/x-date-pickers";
import { useAuthUser } from "react-auth-kit";
import { useQuery } from "react-query";
import {
  MonitoredWell,
  NewRegionMeasurement,
  NewWellMeasurement,
  SecurityScope,
} from "@/interfaces";
import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(timezone);

import { useGetUserList } from "@/service";
import { useFetchWithAuth } from "@/hooks";

type CreateModalProps =
  | {
      mode: "region";
      region_id?: number;
      open: boolean;
      onClose: () => void;
      handleSubmitNewMeasurement: (m: Partial<NewRegionMeasurement>) => void;
      title?: string;
    }
  | {
      mode: "well";
      open: boolean;
      onClose: () => void;
      handleSubmitNewMeasurement: (m: Partial<NewWellMeasurement>) => void;
      title?: string;
    };

export const CreateModal = (props: CreateModalProps) => {
  const { open, onClose, title = "Create New Measurement" } = props;

  const authUser = useAuthUser();
  const hasAdminScope = authUser()
    ?.user_role.security_scopes.map(
      (scope: SecurityScope) => scope.scope_string,
    )
    .includes("admin");

  const fetchWithAuth = useFetchWithAuth();
  const regionId = props.mode === "region" ? props.region_id : undefined;
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
    enabled: open && props.mode === "region" && !!regionId,
    select: (res) => res.items,
  });

  const userList = useGetUserList();
  const [value, setValue] = useState<number | null>(null);
  const [notSampled, setNotSampled] = useState<boolean>(false);
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

    props.handleSubmitNewMeasurement({
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
            ?.filter(
              (well: MonitoredWell) => well.chloride_group_id === region_id,
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
    );
  };

  const hasValue = value !== null && !Number.isNaN(value);
  const canSave =
    !!selectedUserID &&
    !!selectedWellID &&
    !!date &&
    !!time &&
    (notSampled || hasValue);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby="create-region-measurement-title"
      aria-describedby="create-region-measurement-description"
    >
      <DialogTitle id="create-region-measurement-title">{title}</DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography
            id="create-region-measurement-description"
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

          <FormControlLabel
            value="bottom"
            control={
              <Checkbox
                size="large"
                icon={<RadioButtonUnchecked />}
                checkedIcon={<TaskAlt />}
                checked={notSampled}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setNotSampled(checked);

                  if (checked) {
                    setValue(null);
                  }
                }}
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
            value={notSampled ? "" : (value ?? "")}
            label={notSampled ? "NOT SAMPLED" : "Value"}
            onChange={(event) => {
              const newValue = event.target.value;
              setValue(newValue === "" ? null : Number(newValue));
            }}
          />
          {props.mode === "region" && regionId ? (
            <WellSelection region_id={regionId} />
          ) : null}
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
          type="submit"
          variant="contained"
          color="success"
          onClick={onMeasurementSubmitted}
          disabled={!canSave}
          sx={{ flexShrink: 0, width: { xs: "100%", sm: "auto" } }}
          startIcon={<Save fontSize="small" />}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};
