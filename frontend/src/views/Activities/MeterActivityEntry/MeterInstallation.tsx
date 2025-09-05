import {
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { ActivityType } from "../../../enums";
import ControlledTextbox from "../../../components/RHControlled/ControlledTextbox";
import ControlledWellSelection from "../../../components/RHControlled/ControlledWellSelection";
import { formatLatLong } from "../../../conversions";

export default function MeterInstallation({ control, errors, watch }: any) {
  const isActivity = (activitiesList: ActivityType[]) =>
    activitiesList.some(
      (type: ActivityType) =>
        type == watch("activity_details.activity_type")?.name,
    );

  return (
    <Grid container item xs={12} sx={{ mt: 6 }}>
      <Typography variant="h6" fontWeight="bold">
        Current Installation
      </Typography>
      <Grid item xs={12}>
        <TableContainer sx={{ mb: 3, mt: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{ fontWeight: 700, fontSize: "1rem", width: "15%" }}
                >
                  Status
                </TableCell>
                <TableCell
                  sx={{ fontWeight: 700, fontSize: "1rem", width: "25%" }}
                >
                  TRSS
                </TableCell>
                <TableCell
                  sx={{ fontWeight: 700, fontSize: "1rem", width: "35%" }}
                >
                  Lat/Long
                </TableCell>
                <TableCell
                  sx={{ fontWeight: 700, fontSize: "1rem", width: "25%" }}
                >
                  OSE Tag
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell sx={{ fontSize: "1rem" }}>
                  {watch("current_installation.meter.status.status_name") ?? ""}
                </TableCell>
                <TableCell sx={{ fontSize: "1rem" }}>
                  {watch("current_installation.well")?.location?.trss ?? ""}
                </TableCell>
                <TableCell sx={{ fontSize: "1rem" }}>
                  {watch("current_installation.well")?.location?.latitude ==
                    null
                    ? "--"
                    : formatLatLong(
                      watch("current_installation.well")?.location?.latitude,
                      watch("current_installation.well")?.location?.longitude,
                    )}
                </TableCell>
                <TableCell sx={{ fontSize: "1rem" }}>
                  {watch("current_installation.well")?.osetag ?? "--"}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Grid>
      <Grid container item xs={12} spacing={2}>
        <Grid item xs={12} sm={4}>
          <ControlledTextbox
            name="current_installation.meter.water_users"
            control={control}
            label="Water Users"
            disabled={
              !(
                isActivity([ActivityType.Install]) ||
                isActivity([ActivityType.ChangeWaterUsers])
              )
            }
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <ControlledTextbox
            name="current_installation.meter.meter_owner"
            control={control}
            label="Meter Owner"
            disabled={!isActivity([ActivityType.Sell])}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <ControlledWellSelection
            name="current_installation.well"
            control={control}
            disabled={!isActivity([ActivityType.Install])}
            error={errors?.current_installation?.well?.message != undefined}
            helperText={errors?.well?.message}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <ControlledTextbox
            name="current_installation.meter.contact_name"
            control={control}
            label={"Contact Name"}
            value={watch("current_installation.meter")?.contact_name ?? ""}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <ControlledTextbox
            name="current_installation.meter.contact_phone"
            control={control}
            label={"Contact Phone"}
            value={watch("current_installation.meter")?.contact_phone ?? ""}
          />
        </Grid>
      </Grid>
      <Grid item xs={12} sx={{ mt: 2 }}>
        <ControlledTextbox
          name="current_installation.meter.notes"
          control={control}
          label={"Meter Notes"}
          value={watch("current_installation.meter")?.notes ?? ""}
          rows={3}
          multiline
        />
      </Grid>
    </Grid>
  );
}
