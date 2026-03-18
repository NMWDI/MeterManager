import { useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { useAuthUser } from "react-auth-kit";
import { Grid, Card, CardContent, Stack, Button } from "@mui/material";
import { Save, Construction } from "@mui/icons-material";
import {
  PatchActivityForm,
  PatchActivitySubmit,
  SecurityScope,
} from "@/interfaces";
import { useUpdateActivity, useDeleteActivity } from "@/service/ApiServiceNew";
import dayjs from "dayjs";
import { enqueueSnackbar } from "notistack";
import {
  ControlledDatepicker,
  ControlledTimepicker,
  ControlledActivitySelect,
  ControlledUserSelect,
  ControlledWellSelection,
  ControlledTextbox,
  NotesChipSelect,
  ServicesChipSelect,
  PartsChipSelect,
  ControlledCheckbox,
  CustomCardHeader,
} from "@/components";

export const SelectedActivityDetails = ({
  selectedActivity,
  onDeletion,
  afterSave,
}: {
  selectedActivity: PatchActivityForm;
  onDeletion: () => void; //Function to call when the activity is deleted, use to update the history table
  afterSave: () => void;
}) => {
  const {
    handleSubmit,
    control,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<PatchActivityForm>({ defaultValues: selectedActivity });

  function onSuccessfulUpdate() {
    enqueueSnackbar("Successfully Updated Observation!", {
      variant: "success",
    });
    afterSave();
  }
  function onSuccessfulDelete() {
    enqueueSnackbar("Successfully Deleted Observation!", {
      variant: "success",
    });
    onDeletion();
  }
  const updateActivity = useUpdateActivity(onSuccessfulUpdate);
  const deleteActivity = useDeleteActivity(onSuccessfulDelete);

  const onSaveChanges: SubmitHandler<any> = (data) => {
    //Timestamp conversion function - Input date and time are 'America/Denver' and should be combined into a UTC timestamp
    function convertTimestamp(date: dayjs.Dayjs, time: dayjs.Dayjs) {
      let dateUTC = date.tz("America/Denver").utc().format("YYYY-MM-DD");
      let timeUTC = time.tz("America/Denver").utc().format("HH:mm");
      return dateUTC + "T" + timeUTC;
    }

    //Convert the form data to the PatchObservationSubmit type
    let activity_data: PatchActivitySubmit = {
      activity_id: selectedActivity.activity_id,
      timestamp_start: convertTimestamp(
        data.activity_date,
        data.activity_start_time,
      ),
      timestamp_end: convertTimestamp(
        data.activity_date,
        data.activity_end_time,
      ),
      description: data.description,
      submitting_user_id: data.submitting_user.id,
      meter_id: selectedActivity.meter_id,
      activity_type_id: data.activity_type.id,
      location_id: data.well?.location_id,
      ose_share: data.ose_share,
      water_users: data.water_users,

      note_ids: data.notes.map((note: any) => note.id),
      service_ids: data.services.map((service: any) => service.id),
      part_ids: data.parts_used.map((part: any) => part.id),
    };
    updateActivity.mutate(activity_data);
  };

  function handleDelete() {
    //Warn user before deleting
    if (window.confirm("Are you sure you want to delete this activity?")) {
      deleteActivity.mutate(selectedActivity.activity_id);
    }
  }

  //Update the form when selectedActivity changes
  useEffect(() => {
    reset(selectedActivity);
  }, [selectedActivity.activity_id]);

  //User must have admin scope to edit history items
  const authUser = useAuthUser();
  const hasAdminScope = authUser()
    ?.user_role.security_scopes.map(
      (scope: SecurityScope) => scope.scope_string,
    )
    .includes("admin");

  return (
    <Card>
      <CustomCardHeader
        title={`Activity ID: ${selectedActivity.activity_id}`}
        icon={Construction}
      />
      <CardContent>
        <Grid container spacing={2}>
          <Grid item xs={12} lg={6}>
            <ControlledUserSelect name="submitting_user" control={control} />
          </Grid>
          <Grid item xs={12} lg={6}>
            <ControlledDatepicker
              label="Date"
              name="activity_date"
              control={control}
              sx={{ width: "100%" }}
            />
          </Grid>
          <Grid item xs={12} lg={6}>
            <ControlledTimepicker
              label="Start Time"
              name="activity_start_time"
              control={control}
              sx={{ width: "100%" }}
            />
          </Grid>
          <Grid item xs={12} lg={6}>
            <ControlledTimepicker
              label="End Time"
              name="activity_end_time"
              control={control}
              sx={{ width: "100%" }}
            />
          </Grid>
          <Grid item xs={12} lg={6}>
            <ControlledActivitySelect name="activity_type" control={control} />
          </Grid>
          <Grid item xs={12} lg={6}>
            <ControlledWellSelection name="well" control={control} />
          </Grid>
          <Grid item xs={12} lg={6}>
            <ControlledTextbox
              name="water_users"
              control={control}
              label="Water Users"
            />
          </Grid>
          <Grid item xs={12}>
            <ControlledTextbox
              name="description"
              control={control}
              label="Description"
              rows={2}
              multiline
            />
          </Grid>
          <Grid item xs={12}>
            <ServicesChipSelect name="services" control={control} />
          </Grid>
          <Grid item xs={12}>
            <NotesChipSelect
              name="notes"
              control={control}
              errors={errors}
              watch={watch}
              setValue={setValue}
            />
          </Grid>
          <Grid item xs={12}>
            <PartsChipSelect
              name="parts_used"
              control={control}
              meterid={selectedActivity.meter_id}
            />
          </Grid>
          <Grid item xs={12}>
            <ControlledCheckbox
              name="ose_share"
              control={control}
              label="Share activity with OSE"
              labelPlacement="start"
            />
          </Grid>
          <Grid item xs={12}>
            <Stack direction="row" spacing={2}>
              <Button
                color="success"
                variant="contained"
                onClick={handleSubmit(onSaveChanges)}
                disabled={!hasAdminScope}
              >
                <Save sx={{ fontSize: "1.2rem" }} />
                &nbsp; Save Changes
              </Button>
              <Button
                variant="contained"
                onClick={handleDelete}
                disabled={!hasAdminScope}
              >
                Delete
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};
