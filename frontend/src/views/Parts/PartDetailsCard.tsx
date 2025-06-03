import { useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Select,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import SaveAsIcon from "@mui/icons-material/SaveAs";
import CancelIcon from "@mui/icons-material/Cancel";
import * as Yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { enqueueSnackbar } from "notistack";
import { useFieldArray } from "react-hook-form";

import {
  useCreatePart,
  useGetMeterTypeList,
  useGetPart,
  useUpdatePart,
} from "../../service/ApiServiceNew";
import ControlledTextbox from "../../components/RHControlled/ControlledTextbox";
import ControlledPartTypeSelect from "../../components/RHControlled/ControlledPartTypeSelect";
import { MeterTypeLU, Part } from "../../interfaces";
import { ControlledSelectNonObject } from "../../components/RHControlled/ControlledSelect";
import { CustomCardHeader } from "../../components/CustomCardHeader";

const PartResolverSchema: Yup.ObjectSchema<any> = Yup.object().shape({
  part_number: Yup.string().required("Please enter a part number."),
  count: Yup.number()
    .typeError("Please enter a number.")
    .required("Please enter a count."),
  part_type: Yup.mixed().required("Please select a part type."),
  in_use: Yup.boolean()
    .typeError("Please indicate if part is in use.")
    .required("Please indicate if part is in use."),
  commonly_used: Yup.boolean()
    .typeError("Please indicate if part is commonly used.")
    .required("Please indicate if part is commonly_used."),
});

interface PartDetailsCard {
  selectedPartID: number | undefined;
  partAddMode: boolean;
}

export const PartDetailsCard = ({
  selectedPartID,
  partAddMode,
}: PartDetailsCard) => {
  const {
    handleSubmit,
    control,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<Part>({
    resolver: yupResolver(PartResolverSchema),
  });

  // Associated meter types as an array
  const { append, remove } = useFieldArray({
    control,
    name: "meter_types",
  });

  function onSuccessfulUpdate() {
    enqueueSnackbar("Successfully Updated Part!", { variant: "success" });
  }
  function onSuccessfulCreate() {
    enqueueSnackbar("Successfully Created Part!", { variant: "success" });
    reset();
  }
  const updatePart = useUpdatePart(onSuccessfulUpdate);
  const createPart = useCreatePart(onSuccessfulCreate);

  const onSaveChanges: SubmitHandler<any> = (data) => updatePart.mutate(data);
  const onAddPart: SubmitHandler<any> = (data) => createPart.mutate(data);
  const onErr = (data: any) => console.log("ERR: ", data);

  const partDetails = useGetPart(
    selectedPartID ? { part_id: selectedPartID } : undefined,
  );
  const meterTypeList = useGetMeterTypeList();

  // Populate the form with the selected part's details
  useEffect(() => {
    if (partDetails.data != undefined) {
      reset();
      Object.entries(partDetails.data).forEach(([field, value]) => {
        setValue(field as any, value);
      });
    }
  }, [partDetails.data]);

  // Empty the form if entering part add mode
  useEffect(() => {
    if (partAddMode) {
      reset();
    }
  }, [partAddMode]);

  function removeMeterType(meterTypeIndex: number) {
    remove(meterTypeIndex);
  }

  function addMeterType(meterTypeID: number) {
    const newType = meterTypeList.data?.find((x) => x.id === meterTypeID);
    if (newType) append(newType);
  }

  // Determine if form is valid, {errors} in useEffect or formState's isValid don't work
  const hasErrors = () => Object.keys(errors).length > 0;

  return (
    <Card>
      <CustomCardHeader
        title={partAddMode ? "Create Part" : "Edit Part"}
        icon={partAddMode ? AddIcon : EditIcon}
      />
      <CardContent>
        <Grid container>
          <Grid container item xs={12} spacing={2}>
            <Grid item xs={12} xl={6}>
              <ControlledTextbox
                name="part_number"
                control={control}
                label="Part Number"
                error={errors?.part_number?.message != undefined}
                helperText={errors?.part_number?.message}
              />
            </Grid>
            <Grid item xs={12} xl={6}>
              <ControlledPartTypeSelect
                name="part_type"
                control={control}
                error={errors?.part_type?.message}
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
            <Grid item xs={12} xl={6}>
              <ControlledSelectNonObject
                name="commonly_used"
                control={control}
                label="Commonly Used"
                options={[true, false]}
                getOptionLabel={(label: boolean) => (label ? "True" : "False")}
                error={errors?.commonly_used?.message}
              />
            </Grid>
            <Grid item xs={12} xl={6}>
              <ControlledTextbox
                name="count"
                control={control}
                label="Count"
                error={errors?.count?.message != undefined}
                helperText={errors?.count?.message}
              />
            </Grid>
            <Grid item xs={12} xl={6}>
              <ControlledTextbox
                name="price"
                control={control}
                label="Price"
                type="number"
                inputProps={{ step: "0.01" }}
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
          <Grid item xs={12} sx={{ mt: 2 }}>
            <ControlledTextbox
              name="note"
              control={control}
              label="Notes"
              rows={3}
              multiline
            />
          </Grid>
          <Grid container item xs={12}>
            <Grid item xs={12} sx={{ mt: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Associated Meter Types</InputLabel>
                <Select
                  multiple
                  value={watch("meter_types") ?? []}
                  onChange={(event: any) =>
                    addMeterType(
                      event.target.value[event.target.value.length - 1],
                    )
                  }
                  input={<OutlinedInput label="Associated Meter Types" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {selected.map((value, index) => (
                        <Chip
                          key={value.id}
                          label={`${value.brand} - ${value.model}`}
                          clickable
                          deleteIcon={
                            <CancelIcon
                              onMouseDown={(event: any) =>
                                event.stopPropagation()
                              }
                            />
                          }
                          onDelete={() => removeMeterType(index)}
                        />
                      ))}
                    </Box>
                  )}
                >
                  {/* Scope list (with selected scopes filtered out)  */}
                  {meterTypeList.data
                    ?.filter(
                      (x) =>
                        !watch("meter_types")
                          ?.map((scope) => scope.id)
                          .includes(x.id),
                    )
                    .map((type: MeterTypeLU) => (
                      <MenuItem
                        key={type.id}
                        value={type.id}
                      >{`${type.brand} - ${type.model}`}</MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Grid>
        <Grid container item xs={12} sx={{ mt: 2 }}>
          {hasErrors() ? (
            <Alert severity="error" sx={{ width: "50%" }}>
              Please correct any errors before submission.
            </Alert>
          ) : partAddMode ? (
            <Button
              color="success"
              variant="contained"
              onClick={handleSubmit(onAddPart, onErr)}
            >
              <SaveIcon sx={{ fontSize: "1.2rem" }} />
              &nbsp; Save New Part
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
      </CardContent>
    </Card>
  );
};
