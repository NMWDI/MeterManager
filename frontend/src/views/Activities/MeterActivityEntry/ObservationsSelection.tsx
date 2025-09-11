import { useEffect } from "react";
import { Box, Button, Grid, Typography } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import IconButton from "@mui/material/IconButton";
import { useFieldArray } from "react-hook-form";
import dayjs from "dayjs";
import { ObservedPropertyTypeLU } from "../../../interfaces";
import { useGetPropertyTypes } from "../../../service/ApiServiceNew";
import ControlledTimepicker from "../../../components/RHControlled/ControlledTimepicker";
import ControlledTextbox from "../../../components/RHControlled/ControlledTextbox";
import { ControlledSelect } from "../../../components/RHControlled/ControlledSelect";

function ObservationRow({
  control,
  watch,
  errors,
  fieldID,
  index,
  propertyTypes,
  remove,
  setValue,
}: any) {
  useEffect(() => {
    setValue(
      `observations.${index}.unit`,
      watch(`observations.${index}.property_type`)?.units?.at(0),
    );
    setValue(
      `observations.${index}.time`,
      watch("activity_details.start_time"),
    ); //Update the Match start time
  }, [
    watch(`observations.${index}.property_type`),
    watch("activity_details.start_time"),
  ]); // Update the selected unit to the first in the newly selected property type

  return (
    <Grid container item xs={12} spacing={2} sx={{ mb: 2 }} key={fieldID}>
      {!propertyTypes.isLoading && (
        <>
          <Grid item xs={12} sm>
            <ControlledTimepicker
              label="Time"
              name={`observations.${index}.time`}
              control={control}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <ControlledSelect
              name={`observations.${index}.property_type`}
              control={control}
              label={"Reading Type"}
              options={propertyTypes.data ?? []}
              getOptionLabel={(p: ObservedPropertyTypeLU) => p.name}
              error={errors?.observations?.at(index)?.property_type?.message}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <ControlledTextbox
              name={`observations.${index}.reading`}
              control={control}
              label={"Value"}
              error={
                errors?.observations?.at(index)?.reading?.message != undefined
              }
              helperText={errors?.observations?.at(index)?.reading?.message}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <ControlledSelect
              name={`observations.${index}.unit`}
              control={control}
              label={"Unit"}
              options={
                watch(`observations.${index}.property_type`)?.units ?? []
              }
              getOptionLabel={(p: ObservedPropertyTypeLU) => p.name}
              error={errors?.observations?.at(index)?.unit?.message}
            />
          </Grid>
          <Grid item xs="auto" sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <IconButton
              sx={{ ":hover": { color: "red" } }}
              onClick={() => remove(index)}
            >
              <DeleteIcon />
            </IconButton>
          </Grid>
        </>
      )}
    </Grid>
  );
}

export default function ObservationSelection({
  control,
  errors,
  watch,
  setValue,
}: any) {
  const propertyTypes: any = useGetPropertyTypes();

  // React hook formarray
  const { fields, append, remove } = useFieldArray({
    control,
    name: "observations",
  });

  function addObservation() {
    append({
      time: dayjs().utc(),
      reading: "",
      property_type: null,
      unit: null,
    });
  }

  return (
    <Box sx={{ mt: 6 }}>
      <Typography variant="h6" fontWeight="bold">
        Observations
      </Typography>
      <Grid container sx={{ mt: 3 }}>
        {fields.map((field, index) => {
          return (
            <ObservationRow
              control={control}
              watch={watch}
              errors={errors}
              remove={remove}
              fieldID={field.id}
              index={index}
              propertyTypes={propertyTypes}
              setValue={setValue}
            />
          );
        })}
        <Button variant="contained" onClick={addObservation}>
          {fields.length < 1
            ? "+ Add An Observation"
            : "+ Add Another Observation"}
        </Button>
      </Grid>
    </Box>
  );
}
