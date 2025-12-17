import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import { useSnackbar } from "notistack";
import { useForm, SubmitHandler } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { MeterActivitySelection } from "./MeterActivitySelection";
import ObservationSelection from "./ObservationsSelection";
import NotesSelection from "./NotesSelection";
import MeterInstallation from "./MeterInstallation";
import MaintenanceRepairSelection from "./MaintenanceRepairSelection";
import PartsSelection from "./PartsSelection";
import { ActivityFormControl, MeterListDTO } from "../../../interfaces.d";
import { ActivityType } from "../../../enums";
import { useGetMeter, useGetWell } from "../../../service/ApiServiceNew";
import {
  ActivityResolverSchema,
  getDefaultForm,
  toSubmissionForm,
} from "./ActivityFormConfig";
import { useMutation } from "react-query";
import { useAuthHeader } from "react-auth-kit";
import { API_URL } from "../../../config";

export default function MeterActivityEntry() {
  const navigate = useNavigate();
  const authHeader = useAuthHeader();
  const [searchParams] = useSearchParams();
  const { enqueueSnackbar } = useSnackbar();
  const [meterID, setMeterID] = useState<number>();
  const [wellID, setWellID] = useState<number>();
  const meterDetails = useGetMeter(meterID ? { meter_id: meterID } : undefined);
  const wellDetails = useGetWell(wellID ? { well_id: wellID } : undefined);
  const [hasMeterActivityConflict, setHasMeterActivityConflict] =
    useState<boolean>(false);
  const [isMeterAndActivitySelected, setIsMeterAndActivitySelected] =
    useState<boolean>(false);

  const onSuccessfulSubmit = (activity_id: number, meter_id: number) => {
    enqueueSnackbar("Successfully Submitted Activity!", { variant: "success" });
    navigate({
      pathname: "/manage/meters",
      search: `?meter_id=${meter_id}&activity_id=${activity_id}`,
    });
  };

  const createActivity = useMutation({
    mutationFn: async (activityForm: FormData) => {
      const response = await fetch(`${API_URL}/activities`, {
        method: "POST",
        headers: {
          Authorization: authHeader(),
        },
        body: activityForm,
      });

      if (!response.ok) {
        if (response.status == 422) {
          enqueueSnackbar("One or More Required Fields Not Entered!", {
            variant: "error",
          });
          throw Error("Incomplete form, check network logs for details");
        }
        if (response.status == 409) {
          let errorText = await response.text();
          enqueueSnackbar(JSON.parse(errorText).detail, { variant: "error" });
          throw Error(errorText);
        } else {
          enqueueSnackbar("Unknown Error Occurred!", { variant: "error" });
          throw Error("Unknown Error: " + response.status);
        }
      }
      return response.json();
    },
    retry: 0,
    onMutate: () => {
      enqueueSnackbar("Submitting activity...", { variant: "info" });
    },
    onError: (error: any) => {
      enqueueSnackbar(error.message || "Submission failed", {
        variant: "error",
      });
    },
    onSuccess: (responseJson) => {
      const activity_id = responseJson.id;
      const meter_id = responseJson.meter_id;
      enqueueSnackbar("Successfully Submitted Activity!", {
        variant: "success",
      });
      onSuccessfulSubmit(activity_id, meter_id);
    },
  });

  let initialMeter: Partial<MeterListDTO> | null = null;
  const qpMeterID = searchParams.get("meter_id");
  const qpSerialNumber = searchParams.get("serial_number");
  const qpWorkOrderID = searchParams.get("work_order_id");

  if (qpMeterID && qpSerialNumber) {
    initialMeter = {
      id: qpMeterID as unknown as number,
      serial_number: qpSerialNumber,
    };
  }

  const {
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ActivityFormControl>({
    resolver: yupResolver(ActivityResolverSchema),
    defaultValues: getDefaultForm(
      initialMeter,
      qpWorkOrderID ? parseInt(qpWorkOrderID) : null,
    ),
  });

  const onSubmit: SubmitHandler<ActivityFormControl> = (data) =>
    createActivity.mutate(toSubmissionForm(data));

  useEffect(() => {
    setHasMeterActivityConflict(
      (meterDetails.data?.status.status_name == "Installed" &&
        watch("activity_details.activity_type")?.name ==
          ActivityType.Install) ||
        (meterDetails.data?.status.status_name != "Installed" &&
          watch("activity_details.activity_type")?.name ==
            ActivityType.Uninstall),
    );
  }, [meterDetails.data, watch("activity_details.activity_type")?.name]);

  useEffect(() => {
    setIsMeterAndActivitySelected(
      watch("activity_details.selected_meter") != null &&
        watch("activity_details.activity_type") != null,
    );
  }, [
    watch("activity_details.selected_meter"),
    watch("activity_details.activity_type"),
  ]);

  useEffect(() => {
    if (meterDetails.data) {
      setValue("current_installation.meter", meterDetails.data);
      setWellID(meterDetails.data?.well?.id);
    }
  }, [meterDetails.data]); // Set the form's current meter details based on API response

  useEffect(() => {
    setMeterID(watch("activity_details.selected_meter.id"));
  }, [watch("activity_details.selected_meter")]); // Update the ID used by meterDetails if a new meter is selected

  useEffect(() => {
    if (wellDetails.data)
      setValue("current_installation.well", wellDetails.data);
  }, [wellDetails.data]); // Set the form's current well details based on API response

  const hasErrors = (errors: any) => Object.keys(errors).length > 0;

  return (
    <Stack spacing={3}>
      <MeterActivitySelection
        control={control}
        errors={errors}
        watch={watch}
        setValue={setValue}
      />
      {!hasMeterActivityConflict && isMeterAndActivitySelected ? (
        <Stack spacing={3}>
          <MeterInstallation
            control={control}
            errors={errors}
            watch={watch}
            setValue={setValue}
          />
          <ObservationSelection
            control={control}
            errors={errors}
            watch={watch}
            setValue={setValue}
          />
          <MaintenanceRepairSelection
            control={control}
            errors={errors}
            watch={watch}
            setValue={setValue}
          />
          <NotesSelection
            control={control}
            errors={errors}
            watch={watch}
            setValue={setValue}
          />
          <PartsSelection
            control={control}
            errors={errors}
            watch={watch}
            setValue={setValue}
          />
          <Box
            sx={{
              mt: 2,
              display: "flex",
              justifyContent: { xs: "center", sm: "flex-start" },
            }}
          >
            {hasErrors(errors) ? (
              <Alert
                severity="error"
                sx={{ width: { xs: "100%", sm: "auto" } }}
              >
                Please correct any errors before submission.
              </Alert>
            ) : (
              <Button
                disabled={createActivity.isLoading}
                variant="contained"
                type="submit"
                onClick={handleSubmit(onSubmit)}
                sx={{ width: { xs: "100%", sm: "auto" } }}
              >
                Submit
              </Button>
            )}
          </Box>
        </Stack>
      ) : (
        <Box sx={{ mt: 4 }}>
          <Typography
            variant="body1"
            color="text.secondary"
            align="center"
            sx={{ px: { xs: 2, sm: 0 } }}
          >
            {hasMeterActivityConflict
              ? "You cannot install a meter that is already installed, or uninstall a meter that is not currently installed. Please choose a different activity or meter."
              : "Please select a meter and activity to begin."}
          </Typography>
        </Box>
      )}
    </Stack>
  );
}
