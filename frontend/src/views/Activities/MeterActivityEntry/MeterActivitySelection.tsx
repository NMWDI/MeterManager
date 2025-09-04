import { Grid } from "@mui/material";
import ControlledMeterSelection from "../../../components/RHControlled/ControlledMeterSelection";
import ControlledActivitySelect from "../../../components/RHControlled/ControlledActivitySelect";
import ControlledUserSelect from "../../../components/RHControlled/ControlledUserSelect";
import ControlledDatepicker from "../../../components/RHControlled/ControlledDatepicker";
import ControlledTimepicker from "../../../components/RHControlled/ControlledTimepicker";
import ControlledCheckbox from "../../../components/RHControlled/ControlledCheckbox";
import { ControlledWorkOrderSelect } from "../../../components/RHControlled/ControlledWorkOrderSelect";

export function MeterActivitySelection({ control, errors, setValue }: any) {
  return (
    <Grid container item>
      <Grid container item xs={12} spacing={2}>
        <Grid item xs={4}>
          <ControlledMeterSelection
            name="activity_details.selected_meter"
            control={control}
            error={errors?.activity_details?.selected_meter?.message}
          />
        </Grid>

        <Grid item xs={4}>
          <ControlledActivitySelect
            name="activity_details.activity_type"
            control={control}
            error={errors?.activity_details?.activity_type?.message}
          />
        </Grid>

        <Grid item xs={4}>
          <ControlledUserSelect
            name="activity_details.user"
            control={control}
            errors={errors}
            hideAndSelectCurrentUser={false} //Temporary disable of this admin feature
            setValue={setValue}
            error={errors?.activity_details?.user?.message}
          />
        </Grid>
      </Grid>

      <Grid container item xs={12} sx={{ mt: 1 }} spacing={2}>
        <Grid item xs={4}>
          <ControlledDatepicker
            label="Date"
            name="activity_details.date"
            control={control}
            error={errors?.activity_details?.date?.message}
            sx={{ width: "100%" }}
          />
        </Grid>
        <Grid item xs={4}>
          <ControlledTimepicker
            label="Start Time"
            name="activity_details.start_time"
            control={control}
            error={errors?.activity_details?.start_time?.message}
            sx={{ width: "100%" }}
          />
        </Grid>
        <Grid item xs={4}>
          <ControlledTimepicker
            label="End Time"
            name="activity_details.end_time"
            control={control}
            error={errors?.activity_details?.end_time?.message}
            sx={{ width: "100%" }}
          />
        </Grid>
      </Grid>
      <Grid container item xs={12} sx={{ mt: 1 }} spacing={2}>
        <Grid item xs={4}>
          <ControlledWorkOrderSelect
            name="activity_details.work_order_id"
            control={control}
          />
        </Grid>
      </Grid>
      <Grid container item xs={12} sx={{ mt: 1 }} spacing={2}>
        <Grid item xs={4}>
          <ControlledCheckbox
            name="activity_details.share_ose"
            control={control}
            label="Share activity with OSE"
            labelPlacement="start"
          />
        </Grid>
      </Grid>
    </Grid>
  );
}
