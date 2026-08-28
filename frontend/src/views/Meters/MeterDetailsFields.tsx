import { useEffect, useState } from "react";
import {
  useFieldArray,
  useForm,
  Resolver,
  SubmitHandler,
  SubmitErrorHandler,
} from "react-hook-form";
import { enqueueSnackbar } from "notistack";
import { useAuthUser } from "react-auth-kit";
import { useNavigate } from "@tanstack/react-router";
import { Add, Delete, Grading, Save, SaveAs } from "@mui/icons-material";
import {
  Button,
  Grid,
  Card,
  CardContent,
  IconButton,
  InputAdornment,
  Skeleton,
  Typography,
} from "@mui/material";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import * as Yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  CustomCardHeader,
  ControlledTextbox,
  ControlledMeterTypeSelect,
  ControlledWellSelection,
  ControlledMeterStatusTypeSelect,
  ControlledMeterRegisterSelect,
  FieldLoadingSkeleton,
} from "@/components";
import { SecurityScope, Meter } from "@/interfaces";
import { useCreateMeter, useGetMeter, useUpdateMeter } from "@/service";
import { formatLatLong } from "@/conversions";

const MeterResolverSchema = Yup.object().shape({
  serial_number: Yup.string().required("Please enter a serial number."),
  price: Yup.number().nullable().min(0, "Price cannot be negative"),
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
  const isSelectedMeterLoading =
    !meterAddMode && selectedMeterID !== undefined && meterDetails.isLoading;

  const {
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<Meter>({
    resolver: yupResolver(MeterResolverSchema) as unknown as Resolver<Meter>,
    defaultValues: {
      contacts: [],
    },
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "contacts",
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

  const onSaveChanges: SubmitHandler<Meter> = (data) => {
    updateMeter.mutate(data);
  };
  const onAddMeter: SubmitHandler<Meter> = (data) => {
    createMeter.mutate({
      ...data,
      well: data.well || null,
    });
  };
  const onErr: SubmitErrorHandler<Meter> = (data) => {
    console.log("ERR: ", data);
    enqueueSnackbar("Please correct any errors before submission.", {
      variant: "error",
    });
  };

  // Populate whenever a selected meter is active,
  useEffect(() => {
    if (
      meterAddMode ||
      selectedMeterID === undefined ||
      meterDetails.data == undefined
    )
      return;

    reset();
    setIsInitialLoad(false);
    const contacts =
      meterDetails.data.contacts && meterDetails.data.contacts.length > 0
        ? meterDetails.data.contacts
        : meterDetails.data.contact_name || meterDetails.data.contact_phone
          ? [
              {
                name: meterDetails.data.contact_name,
                address: null,
              },
            ]
          : [];
    reset({
      ...meterDetails.data,
      contacts,
    });
  }, [meterAddMode, selectedMeterID, meterDetails.data, reset]);

  // Empty form if entering add mode
  useEffect(() => {
    if (meterAddMode) {
      reset();
      setIsInitialLoad(false);
    }
  }, [meterAddMode, reset]);

  const navigateToNewActivity = () => {
    navigate({
      to: "/activities",
      search: {
        meter_id: selectedMeterID,
        serial_number: meterDetails.data?.serial_number ?? undefined,
        work_order_id: undefined,
      },
    });
  };

  if (isSelectedMeterLoading) {
    return (
      <Card>
        <CustomCardHeader title="Selected Meter Details" icon={Grading} />
        <CardContent>
          <Grid container spacing={2}>
            {Array.from({ length: 6 }).map((_, index) => (
              <Grid item xs={12} lg={6} key={index}>
                <FieldLoadingSkeleton />
              </Grid>
            ))}
            <Grid item xs={12}>
              <Skeleton
                variant="rounded"
                height={115}
                sx={{ borderRadius: 1 }}
              />
            </Grid>
            {Array.from({ length: 4 }).map((_, index) => (
              <Grid item xs={12} lg={6} key={`tail-${index}`}>
                <FieldLoadingSkeleton />
              </Grid>
            ))}
            <Grid item xs={12}>
              <Skeleton
                variant="rounded"
                height={90}
                sx={{ borderRadius: 1 }}
              />
            </Grid>
            <Grid item xs={12} sx={{ display: "flex", gap: 2 }}>
              <Skeleton variant="rounded" height={42} width={170} />
              {hasAdminScope && (
                <Skeleton variant="rounded" height={42} width={170} />
              )}
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CustomCardHeader
        title={meterAddMode ? "Add New Meter" : "Selected Meter Details"}
        icon={meterAddMode ? Add : Grading}
      />
      <CardContent>
        <Grid container spacing={2}>
          <Grid item xs={12} lg={6}>
            <ControlledTextbox
              name="serial_number"
              control={control}
              label="Serial Number"
              error={errors?.serial_number?.message != undefined}
              helperText={errors?.serial_number?.message}
              disabled={!hasAdminScope || isInitialLoad}
            />
          </Grid>
          <Grid item xs={12} lg={6}>
            <ControlledMeterTypeSelect
              name="meter_type"
              control={control}
              errors={errors?.meter_type?.message}
              disabled={!hasAdminScope || isInitialLoad}
            />
          </Grid>
          <Grid item xs={12} lg={6}>
            <ControlledMeterRegisterSelect
              name="meter_register"
              control={control}
              meterType={watch("meter_type")}
              disabled={!hasAdminScope || isInitialLoad}
              error={errors?.meter_register != undefined}
              helperText={errors?.meter_register?.message}
            />
          </Grid>
          <Grid item xs={12} lg={6}>
            <ControlledMeterStatusTypeSelect
              name="status"
              control={control}
              disabled={!hasAdminScope || isInitialLoad}
            />
          </Grid>
          <Grid item xs={12} lg={6}>
            <ControlledWellSelection
              name="well"
              control={control}
              errors={errors?.meter_type?.message}
              disabled={!hasAdminScope || isInitialLoad}
            />
          </Grid>
          <Grid item xs={12} lg={6}>
            <ControlledTextbox
              name="price"
              control={control}
              label="Meter Price"
              error={errors?.price?.message != undefined}
              helperText={errors?.price?.message}
              disabled={!hasAdminScope || isInitialLoad}
              type="number"
              inputProps={{ step: "0.01" }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">$</InputAdornment>
                ),
              }}
            />
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
                      {!watch("well")?.location?.latitude ||
                      !watch("well")?.location?.longitude
                        ? "--"
                        : formatLatLong(
                            watch("well")?.location?.latitude ?? 0,
                            watch("well")?.location?.longitude ?? 0,
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
          <Grid item xs={12} lg={6}>
            <ControlledTextbox
              name="water_users"
              control={control}
              label="Water Users"
              disabled={!hasAdminScope || isInitialLoad}
            />
          </Grid>
          <Grid item xs={12} lg={6}>
            <ControlledTextbox
              name="meter_owner"
              control={control}
              label="Meter Owner"
              disabled={!hasAdminScope || isInitialLoad}
            />
          </Grid>
          <Grid item xs={12}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs>
                <Typography variant="h6">Contacts</Typography>
              </Grid>
              {hasAdminScope && !isInitialLoad && (
                <Grid item>
                  <Button
                    variant="outlined"
                    startIcon={<Add />}
                    onClick={() =>
                      append({
                        name: "",
                        address: "",
                      })
                    }
                  >
                    Add Contact
                  </Button>
                </Grid>
              )}
            </Grid>
          </Grid>
          {fields.length === 0 ? (
            <Grid item xs={12}>
              <Typography color="text.secondary">No contacts</Typography>
            </Grid>
          ) : (
            fields.map((field, index) => (
              <Grid container item xs={12} spacing={2} key={field.id}>
                <Grid item xs={12} lg={5}>
                  <ControlledTextbox
                    name={`contacts.${index}.name`}
                    control={control}
                    label="Contact Name"
                    disabled={!hasAdminScope || isInitialLoad}
                  />
                </Grid>
                <Grid item xs={12} lg={6}>
                  <ControlledTextbox
                    name={`contacts.${index}.address`}
                    control={control}
                    label="Address"
                    disabled={!hasAdminScope || isInitialLoad}
                  />
                </Grid>
                {hasAdminScope && !isInitialLoad && (
                  <Grid item xs={12} lg={1}>
                    <IconButton
                      aria-label="Remove contact"
                      onClick={() => remove(index)}
                    >
                      <Delete />
                    </IconButton>
                  </Grid>
                )}
              </Grid>
            ))
          )}
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
                    <Save sx={{ fontSize: "1.2rem" }} />
                    &nbsp; Save New Meter
                  </Button>
                ) : (
                  <Button
                    color="success"
                    variant="contained"
                    onClick={handleSubmit(onSaveChanges, onErr)}
                  >
                    <SaveAs sx={{ fontSize: "1.2rem" }} />
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
