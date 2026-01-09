import { useEffect } from "react";
import { Box, Button, Grid, Typography, IconButton } from "@mui/material";
import { UseQueryResult } from "react-query";
import { Delete } from "@mui/icons-material";
import { useFieldArray, useWatch } from "react-hook-form";
import { ObservedPropertyTypeLU } from "../../../interfaces";
import { useGetPropertyTypes } from "../../../service/ApiServiceNew";
import { ControlledSelectNonObject } from "../../../components/RHControlled/ControlledSelect";
import ControlledTimepicker from "../../../components/RHControlled/ControlledTimepicker";
import ControlledTextbox from "../../../components/RHControlled/ControlledTextbox";
import dayjs from "dayjs";

const ObservationRow = ({
  control,
  errors,
  fieldID,
  index,
  propertyTypes,
  remove,
  setValue,
}: {
  control: any;
  setValue: any;
  errors: any;

  index: number;
  fieldID: string;
  remove: (index: number) => void;

  propertyTypes: UseQueryResult<ObservedPropertyTypeLU[], Error>;
}) => {
  const propertyTypeId = useWatch({
    control,
    name: `observations.${index}.property_type_id`,
  });

  const unitId = useWatch({
    control,
    name: `observations.${index}.unit_id`,
  });

  const propertyType = propertyTypes.data?.find(
    (pt) => pt.id === propertyTypeId,
  );

  useEffect(() => {
    if (
      !propertyType ||
      !propertyType?.units ||
      propertyType?.units?.length === 0
    )
      return;
    if (unitId != null) return;

    setValue(`observations.${index}.unit_id`, propertyType?.units[0].id, {
      shouldDirty: false,
    });
  }, [propertyType, unitId, index, setValue]);

  const startTime = useWatch({
    control,
    name: "activity_details.start_time",
  });

  useEffect(() => {
    if (!startTime) return;

    setValue(`observations.${index}.time`, startTime, { shouldDirty: false });
  }, [startTime, index, setValue]);

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
            <ControlledSelectNonObject
              name={`observations.${index}.property_type_id`}
              control={control}
              label="Reading Type"
              options={propertyTypes.data?.map((pt) => pt.id) ?? []}
              getOptionLabel={(id: number) =>
                propertyTypes.data?.find((pt) => pt.id === id)?.name ?? ""
              }
              error={errors?.observations?.[index]?.property_type_id?.message}
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
            <ControlledSelectNonObject
              name={`observations.${index}.unit_id`}
              control={control}
              label="Unit"
              options={propertyType?.units?.map((u) => u.id) ?? []}
              getOptionLabel={(id: number) =>
                propertyType?.units?.find((u) => u.id === id)?.name ?? ""
              }
              error={errors?.observations?.[index]?.unit_id?.message}
            />
          </Grid>
          <Grid
            item
            xs="auto"
            sx={{ display: "flex", justifyContent: "flex-end" }}
          >
            <IconButton
              sx={{ ":hover": { color: "red" } }}
              onClick={() => remove(index)}
            >
              <Delete />
            </IconButton>
          </Grid>
        </>
      )}
    </Grid>
  );
};

export default function ObservationSelection({
  control,
  errors,
  setValue,
}: any) {
  const propertyTypes: UseQueryResult<ObservedPropertyTypeLU[], Error> =
    useGetPropertyTypes();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "observations",
  });

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
              errors={errors}
              remove={remove}
              fieldID={field.id}
              index={index}
              propertyTypes={propertyTypes}
              setValue={setValue}
            />
          );
        })}
        <Button
          variant="contained"
          onClick={() => {
            append({
              time: dayjs().utc(),
              reading: "",
              property_type_id: null,
              unit_id: null,
            });
          }}
        >
          {fields.length < 1
            ? "+ Add An Observation"
            : "+ Add Another Observation"}
        </Button>
      </Grid>
    </Box>
  );
}
