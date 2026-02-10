import { Box, Grid, Typography } from "@mui/material";
import { useFieldArray } from "react-hook-form";
import { ControlledTextbox, StyledToggleButton } from "@/components";
import { useGetServiceTypes } from "@/service/ApiServiceNew";

export default function MaintenanceRepairSelection({
  control,
  errors,
  watch,
}: any) {
  const serviceTypes = useGetServiceTypes();

  const { append, remove } = useFieldArray({
    control,
    name: "maintenance_repair.service_type_ids",
  });

  const isSelected = (ID: number) =>
    watch("maintenance_repair.service_type_ids")?.some((x: any) => x == ID);

  const unselectItem = (ID: number) =>
    remove(
      watch("maintenance_repair.service_type_ids")?.findIndex(
        (x: any) => x == ID,
      ),
    );

  const selectItem = (ID: number) => append(ID);

  const MaintanenceToggleButton = ({ item }: any) => (
    <Grid item xs={12} sm={4} lg={2} key={item.id}>
      <StyledToggleButton
        value="check"
        selected={isSelected(item.id)}
        onChange={() => {
          isSelected(item.id) ? unselectItem(item.id) : selectItem(item.id);
        }}
      >
        {item.service_name}
      </StyledToggleButton>
    </Grid>
  );

  return (
    <Box sx={{ mt: 6 }}>
      <Typography variant="h6" fontWeight="bold">
        Maintanence/Repair
      </Typography>
      <Grid container sx={{ mt: 3 }}>
        {serviceTypes.isLoading ? (
          <Grid container item xs={12}>
            Loading items...
          </Grid>
        ) : (
          <Grid container item xs={12}>
            <Grid container item spacing={2}>
              {serviceTypes.data?.map((item: any) => {
                return <MaintanenceToggleButton key={item.id} item={item} />;
              })}
            </Grid>
          </Grid>
        )}
        <Grid container item sx={{ mt: 2 }}>
          <ControlledTextbox
            name="maintenance_repair.description"
            control={control}
            error={errors?.maintenance_repair?.description?.message}
            label={"Description"}
            rows={3}
            multiline
          />
        </Grid>
      </Grid>
    </Box>
  );
}
