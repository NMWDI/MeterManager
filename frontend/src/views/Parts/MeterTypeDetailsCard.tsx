import { useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { Alert, Button, Card, CardContent, Grid } from "@mui/material";
import { Add, Edit, Save, SaveAs } from "@mui/icons-material";
import * as Yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { enqueueSnackbar } from "notistack";

import { useCreateMeterType, useUpdateMeterType } from "@/service";
import {
  ControlledTextbox,
  ControlledSelectNonObject,
  CustomCardHeader,
} from "@/components";
import { MeterTypeLU } from "@/interfaces";

const MeterTypeResolverSchema: Yup.ObjectSchema<any> = Yup.object().shape({
  brand: Yup.string().required("Please enter a brand."),
  model: Yup.string().required("Please enter a model number."),
  size: Yup.number()
    .typeError("Please enter a number.")
    .required("Please enter a size."),
  in_use: Yup.boolean()
    .typeError("Please indicate if part is in use.")
    .required("Please indicate if part is in use."),
});

export const MeterTypeDetailsCard = ({
  selectedMeterType,
  meterTypeAddMode,
}: {
  selectedMeterType?: MeterTypeLU;
  meterTypeAddMode: boolean;
}) => {
  const {
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors },
  } = useForm<MeterTypeLU>({
    resolver: yupResolver(MeterTypeResolverSchema),
  });

  function onSuccessfulUpdate() {
    enqueueSnackbar("Successfully Updated Meter Type!", { variant: "success" });
  }
  function onSuccessfulCreate() {
    enqueueSnackbar("Successfully Created Meter Type!", { variant: "success" });
  }
  const updateMeterType = useUpdateMeterType(onSuccessfulUpdate);
  const createMeterType = useCreateMeterType(onSuccessfulCreate);

  const onSaveChanges: SubmitHandler<any> = (data) =>
    updateMeterType.mutate(data);
  const onAddPart: SubmitHandler<any> = (data) => createMeterType.mutate(data);
  const onErr = (data: any) => console.log("ERR: ", data);

  // Populate the form with the selected meter type's details
  useEffect(() => {
    if (selectedMeterType != undefined) {
      reset();
      Object.entries(selectedMeterType).forEach(([field, value]) => {
        setValue(field as any, value);
      });
    }
  }, [selectedMeterType]);

  // Empty the form if entering meter type add mode
  useEffect(() => {
    if (meterTypeAddMode) reset();
  }, [meterTypeAddMode]);

  // Determine if form is valid, {errors} in useEffect or formState's isValid don't work
  const hasErrors = () => Object.keys(errors).length > 0;

  return (
    <Card>
      <CustomCardHeader
        title={meterTypeAddMode ? "Create Meter Type" : "Edit Meter Type"}
        icon={meterTypeAddMode ? Add : Edit}
      />
      <CardContent>
        <Grid container>
          <Grid container item xs={12} spacing={2}>
            <Grid item xs={12} xl={6}>
              <ControlledTextbox
                name="brand"
                control={control}
                label="Brand"
                error={errors?.brand?.message != undefined}
                helperText={errors?.brand?.message}
              />
            </Grid>
            <Grid item xs={12} xl={6}>
              <ControlledTextbox
                name="model"
                control={control}
                label="Model Number"
                error={errors?.model?.message != undefined}
                helperText={errors?.model?.message}
              />
            </Grid>
            <Grid item xs={12} xl={6}>
              <ControlledTextbox
                name="size"
                control={control}
                label="Size"
                error={errors?.size?.message != undefined}
                helperText={errors?.size?.message}
              />
            </Grid>
            <Grid item xs={12} xl={6}>
              <ControlledSelectNonObject
                name="in_use"
                control={control}
                label="In Use"
                options={[true, false]}
                getOptionLabel={(label: boolean) => (label ? "True" : "False")}
                error={errors?.in_use?.message}
              />
            </Grid>
          </Grid>
          <Grid item xs={12} sx={{ mt: 2 }}>
            <ControlledTextbox
              name="description"
              control={control}
              label="Description"
            />
          </Grid>
          <Grid container item xs={12} sx={{ mt: 2 }}>
            {hasErrors() ? (
              <Alert severity="error" sx={{ width: "50%" }}>
                Please correct any errors before submission.
              </Alert>
            ) : meterTypeAddMode ? (
              <Button
                color="success"
                variant="contained"
                onClick={handleSubmit(onAddPart, onErr)}
              >
                <Save sx={{ fontSize: "1.2rem" }} />
                &nbsp; Save New Meter Type
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
        </Grid>
      </CardContent>
    </Card>
  );
};
