import { useForm, SubmitHandler } from "react-hook-form";
import { useEffect, useState } from "react";
import { enqueueSnackbar } from "notistack";
import { useAuthUser } from "react-auth-kit";
import { createSearchParams, useNavigate } from "react-router-dom";
import GradingIcon from "@mui/icons-material/Grading";
import AddIcon from "@mui/icons-material/Add";
import SaveIcon from "@mui/icons-material/Save";
import SaveAsIcon from "@mui/icons-material/SaveAs";
import { Button, Grid, Card, CardContent } from "@mui/material";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import { SecurityScope, Meter } from "../../interfaces";
import {
  useCreateMeter,
  useGetMeter,
  useUpdateMeter,
} from "../../service/ApiServiceNew";
import * as Yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import ControlledTextbox from "../../components/RHControlled/ControlledTextbox";
import ControlledMeterTypeSelect from "../../components/RHControlled/ControlledMeterTypeSelect";
import ControlledWellSelection from "../../components/RHControlled/ControlledWellSelection";
import ControlledMeterStatusTypeSelect from "../../components/RHControlled/ControlledMeterStatusTypeSelect";
import { formatLatLong } from "../../conversions";
import ControlledMeterRegisterSelect from "../../components/RHControlled/ControlledMeterRegisterSelect";
import { CustomCardHeader } from "../../components/CustomCardHeader";

const MeterResolverSchema: Yup.ObjectSchema<any> = Yup.object().shape({
  serial_number: Yup.string().required("Please enter a serial number."),
  meter_type: Yup.object().required("Please select a meter type."),
  meter_register: Yup.object().required("Please select a meter register."),
});

export const MeterDetailsFields = ({
  selectedMeterID,
  meterAddMode,
}: {
  selectedMeterID?: number;
  meterAddMode: boolean;
}) => {
  const meterDetails = useGetMeter({ meter_id: selectedMeterID });
  const navigate = useNavigate();
  const authUser = useAuthUser();
  const hasAdminScope = authUser()
    ?.user_role.security_scopes.map(
      (scope: SecurityScope) => scope.scope_string,
    )
    .includes("admin");
  const [isInitialLoad, setIsInitialLoad] = useState(true); //Use to disable fields on initial load

  const {
    handleSubmit,
    control,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<Meter>({
    resolver: yupResolver(MeterResolverSchema),
  });

  function onSuccessfulUpdate() {
    enqueueSnackbar("Successfully Updated Meter!", { variant: "success" });
  }
  function onSuccessfulCreate() {
    enqueueSnackbar("Successfully Created Meter!", { variant: "success" });
    reset();
  }
  const updateMeter = useUpdateMeter(onSuccessfulUpdate);
  const createMeter = useCreateMeter(onSuccessfulCreate);

  const onSaveChanges: SubmitHandler<any> = (data) => {
    updateMeter.mutate(data);
  };
  const onAddMeter: SubmitHandler<any> = (data) => {
    data.well = data.well == "" ? null : data.well; // If no well selected, set to null for API
    createMeter.mutate(data);
  };
  const onErr = (data: any) => {
    console.log("ERR: ", data);
    enqueueSnackbar("Please correct any errors before submission.", {
      variant: "error",
    });
  };

  // Populate the form with the selected meter's details
  useEffect(() => {
    if (meterDetails.data != undefined) {
      reset();
      setIsInitialLoad(false);
      Object.entries(meterDetails.data).forEach(([field, value]) => {
        setValue(field as any, value);
      });
    }
  }, [meterDetails.data]);

  // Empty form if entering add mode
  useEffect(() => {
    if (meterAddMode) {
      reset();
      setIsInitialLoad(false);
    }
  }, [meterAddMode]);

  const navigateToNewActivity = () => {
    navigate({
      pathname: "/activities",
      search: createSearchParams({
        meter_id: selectedMeterID?.toString() ?? "",
        serial_number: meterDetails.data?.serial_number ?? "",
      }).toString(),
    });
  };

  return (
    <Card>
      <CustomCardHeader
        title={meterAddMode ? "Add New Meter" : "Selected Meter Details"}
        icon={meterAddMode ? AddIcon : GradingIcon}
      />
      <CardContent>
        <Grid container spacing={2}>
          <Grid container item xs={12}>
            <Grid item xs={12} lg={5}>
              <ControlledTextbox
                name="serial_number"
                control={control}
                label="Serial Number"
                error={errors?.serial_number?.message != undefined}
                helperText={errors?.serial_number?.message}
                disabled={!hasAdminScope || isInitialLoad}
              />
            </Grid>
          </Grid>
          <Grid container item xs={12}>
            <Grid item xs={12} lg={5}>
              <ControlledMeterTypeSelect
                name="meter_type"
                control={control}
                errors={errors?.meter_type?.message}
                disabled={!hasAdminScope || isInitialLoad}
              />
            </Grid>
          </Grid>
          <Grid container item xs={12}>
            <Grid item xs={12} lg={5}>
              <ControlledMeterRegisterSelect
                name="meter_register"
                control={control}
                meterType={watch("meter_type")}
                disabled={!hasAdminScope || isInitialLoad}
                error={errors?.meter_register != undefined}
                helperText={errors?.meter_register?.message}
              />
            </Grid>
          </Grid>
          <Grid container item xs={12}>
            <Grid item xs={12} lg={5}>
              <ControlledMeterStatusTypeSelect
                name="status"
                control={control}
                disabled={!hasAdminScope || isInitialLoad}
              />
            </Grid>
          </Grid>
          <Grid container item xs={12}>
            <Grid item xs={12} lg={5}>
              <ControlledWellSelection
                name="well"
                control={control}
                errors={errors?.meter_type?.message}
                disabled={!hasAdminScope || isInitialLoad}
              />
            </Grid>
          </Grid>
          <Grid item xs={12}>
            <TableContainer sx={{ mb: 3, mt: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
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
                      {watch("well")?.location?.trss == null
                        ? "--"
                        : watch("well")?.location?.trss}
                    </TableCell>
                    <TableCell sx={{ fontSize: "1rem" }}>
                      {watch("well")?.location?.latitude == null
                        ? "--"
                        : formatLatLong(
                            watch("well")?.location?.latitude,
                            watch("well")?.location?.longitude,
                          )}
                    </TableCell>
                    <TableCell sx={{ fontSize: "1rem" }}>
                      {watch("well")?.osetag == null
                        ? "--"
                        : watch("well")?.osetag}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
          <Grid item xs={4}>
            <ControlledTextbox
              name="water_users"
              control={control}
              label="Water Users"
              disabled={!hasAdminScope || isInitialLoad}
            />
          </Grid>
          <Grid item xs={4}>
            <ControlledTextbox
              name="meter_owner"
              control={control}
              label="Meter Owner"
              disabled={!hasAdminScope || isInitialLoad}
            />
          </Grid>
          <Grid item xs={4}></Grid>
          <Grid item xs={4}>
            <ControlledTextbox
              name="contact_name"
              control={control}
              label="Contact Name"
              error={errors?.contact_name?.message != undefined}
              helperText={errors?.contact_name?.message}
              disabled={!hasAdminScope || isInitialLoad}
            />
          </Grid>
          <Grid item xs={4}>
            <ControlledTextbox
              name="contact_phone"
              control={control}
              label="Contact Phone"
              error={errors?.contact_phone?.message != undefined}
              helperText={errors?.contact_phone?.message}
              disabled={!hasAdminScope || isInitialLoad}
            />
          </Grid>
          <Grid item xs={12}>
            <ControlledTextbox
              name="notes"
              control={control}
              label="Installation Notes"
              error={errors?.notes?.message != undefined}
              helperText={errors?.notes?.message}
              disabled={!hasAdminScope || isInitialLoad}
              rows={3}
              multiline
            />
          </Grid>
          <Grid container item xs={12} spacing={2}>
            {hasAdminScope && (
              <Grid item>
                {meterAddMode ? (
                  <Button
                    color="success"
                    variant="contained"
                    onClick={handleSubmit(onAddMeter, onErr)}
                  >
                    <SaveIcon sx={{ fontSize: "1.2rem" }} />
                    &nbsp; Save New Meter
                  </Button>
                ) : (
                  <Button
                    color="success"
                    variant="contained"
                    onClick={handleSubmit(onSaveChanges, onErr)}
                  >
                    <SaveAsIcon sx={{ fontSize: "1.2rem" }} />
                    &nbsp; Save Changes
                  </Button>
                )}
              </Grid>
            )}
            <Grid item>
              <Button
                type="submit"
                variant="contained"
                disabled={
                  meterDetails.data?.status?.status_name == "Scrapped" ||
                  isInitialLoad
                }
                onClick={navigateToNewActivity}
              >
                New Activity
              </Button>
            </Grid>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};
