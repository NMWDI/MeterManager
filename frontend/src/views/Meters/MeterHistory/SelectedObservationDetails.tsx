import { useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { useAuthUser } from "react-auth-kit";
import { enqueueSnackbar } from "notistack";
import { Grid, Card, CardContent, Stack, Button } from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import {
  PatchObservationForm,
  PatchObservationSubmit,
  SecurityScope,
  ObservedPropertyTypeLU,
} from "../../../interfaces";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(timezone);

import ControlledDatepicker from "../../../components/RHControlled/ControlledDatepicker";
import ControlledTimepicker from "../../../components/RHControlled/ControlledTimepicker";
import ControlledUserSelect from "../../../components/RHControlled/ControlledUserSelect";
import ControlledWellSelection from "../../../components/RHControlled/ControlledWellSelection";
import ControlledTextbox from "../../../components/RHControlled/ControlledTextbox";
import { ControlledSelect } from "../../../components/RHControlled/ControlledSelect";
import ControlledCheckbox from "../../../components/RHControlled/ControlledCheckbox";
import {
  useGetPropertyTypes,
  useUpdateObservation,
  useDeleteObservation,
} from "../../../service/ApiServiceNew";
import { CustomCardHeader } from "../../../components/CustomCardHeader";

export const SelectedObservationDetails = ({
  selectedObservation,
  onDeletion,
  afterSave,
}: {
  selectedObservation: PatchObservationForm;
  onDeletion: () => void;
  afterSave: () => void;
}) => {
  const { handleSubmit, control, reset, watch } = useForm<PatchObservationForm>(
    { defaultValues: selectedObservation },
  );
  const propertyTypes: any = useGetPropertyTypes();

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
  const updateObservation = useUpdateObservation(onSuccessfulUpdate);
  const deleteObservation = useDeleteObservation(onSuccessfulDelete);
  const onSaveChanges: SubmitHandler<any> = (data) => {
    //Timestamp conversion function - Input date and time are 'America/Denver' and should be combined into a UTC timestamp
    function convertTimestamp(date: dayjs.Dayjs, time: dayjs.Dayjs) {
      let dateUTC = date.tz("America/Denver").utc().format("YYYY-MM-DD");
      let timeUTC = time.tz("America/Denver").utc().format("HH:mm");
      return dateUTC + "T" + timeUTC;
    }

    //Convert the form data to the PatchObservationSubmit type
    let observation_data: PatchObservationSubmit = {
      observation_id: selectedObservation.observation_id,
      timestamp: convertTimestamp(data.observation_date, data.observation_time),
      observed_property_type_id: data.property_type.id,
      value: data.value,
      unit_id: data.unit.id,
      submitting_user_id: data.submitting_user.id,
      location_id: data.well?.location_id,
      notes: data.notes,
      ose_share: data.ose_share,
      meter_id: selectedObservation.meter_id,
    };
    //console.log(observation_data)
    updateObservation.mutate(observation_data);
  };

  function handleDelete() {
    //Warn user before deleting
    if (window.confirm("Are you sure you want to delete this observation?")) {
      deleteObservation.mutate(selectedObservation.observation_id);
    }
  }

  function getUnitsFromPropertyType(propertyTypeID: number) {
    return (
      propertyTypes.data.find(
        (p: ObservedPropertyTypeLU) => p.id == propertyTypeID,
      )?.units ?? []
    );
  }

  //Update the form when selectedObservation changes
  useEffect(() => {
    reset(selectedObservation);
  }, [selectedObservation.observation_id]);

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
        title={`Observation ID: ${selectedObservation.observation_id}`}
        icon={InfoOutlinedIcon}
      />
      <CardContent>
        <Grid container item xs={10}>
          <Grid container item xs={12} spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={4}>
              <ControlledDatepicker
                label="Date"
                name="observation_date"
                control={control}
                error={""}
                sx={{ width: "100%" }}
              />
            </Grid>
            <Grid item xs={4}>
              <ControlledTimepicker
                label="Time"
                name="observation_time"
                control={control}
                error={""}
                sx={{ width: "100%" }}
              />
            </Grid>
          </Grid>

          <Grid container item xs={12} spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={4}>
              <ControlledSelect
                name={"property_type"}
                control={control}
                label={"Reading Type"}
                options={propertyTypes.data ?? []}
                getOptionLabel={(p: ObservedPropertyTypeLU) => p.name}
              />
            </Grid>
            <Grid item xs={4}>
              <ControlledTextbox
                name={"value"}
                control={control}
                label={"Value"}
              />
            </Grid>
            <Grid item xs={4}>
              <ControlledSelect
                name={"unit"}
                control={control}
                label={"Unit"}
                options={
                  propertyTypes.isLoading
                    ? []
                    : getUnitsFromPropertyType(watch(`property_type`).id)
                }
                getOptionLabel={(p: ObservedPropertyTypeLU) => p.name}
              />
            </Grid>
          </Grid>

          <Grid container item xs={12} spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={4}>
              <ControlledUserSelect
                name="submitting_user"
                control={control}
                errors={""}
              />
            </Grid>
            <Grid item xs={4}>
              <ControlledWellSelection
                name="well"
                control={control}
                errors={""}
              />
            </Grid>
          </Grid>

          <Grid container item xs={12} sx={{ mt: 2 }}>
            <ControlledTextbox
              name="notes"
              control={control}
              label="Notes"
              rows={2}
              multiline
            />
          </Grid>

          <Grid item xs={5}>
            <ControlledCheckbox
              name="ose_share"
              control={control}
              label="Share activity with OSE"
              labelPlacement="start"
            />
          </Grid>

          <Grid container item xs={12} sx={{ mt: 2 }}>
            <Stack direction="row" spacing={2}>
              <Button
                color="success"
                variant="contained"
                onClick={handleSubmit(onSaveChanges)}
                disabled={!hasAdminScope}
              >
                <SaveIcon sx={{ fontSize: "1.2rem" }} />
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
