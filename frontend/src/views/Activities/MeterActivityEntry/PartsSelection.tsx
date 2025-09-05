import { useState, useEffect } from "react";
import { produce } from "immer";
import {
  Box,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
} from "@mui/material";
import { useFieldArray } from "react-hook-form";
import { Part } from "../../../interfaces";
import { StyledToggleButton } from "../../../components";
import { useGetMeterPartsList } from "../../../service/ApiServiceNew";

export default function PartsSelection({ control, watch, setValue }: any) {
  const partsList = useGetMeterPartsList({
    meter_id: watch("activity_details.selected_meter.id") ?? undefined,
  });
  // The default parts, and user-added ones from select dropdown
  const [visiblePartIDs, setVisiblePartIDs] = useState<number[]>([]);

  // Set commonly used parts visible by default
  useEffect(() => {
    setVisiblePartIDs(
      partsList.data
        ?.filter((p: Part) => p.commonly_used == true)
        .map((p: Part) => p.id) ?? [],
    );
    setValue("part_used_ids", []);
  }, [partsList.data]);

  const { append, remove } = useFieldArray({
    control,
    name: "part_used_ids",
  });

  const isSelected = (ID: number) =>
    watch("part_used_ids")?.some((x: any) => x == ID);

  const unselectPart = (ID: number) =>
    remove(watch("part_used_ids")?.findIndex((x: any) => x == ID));

  const selectPart = (ID: number) => append(ID);

  const PartToggleButton = ({ part }: { part: Part }) => (
    <Grid item xs={12} md={6} key={part.id}>
      <StyledToggleButton
        value="check"
        selected={isSelected(part.id)}
        onChange={() => {
          isSelected(part.id) ? unselectPart(part.id) : selectPart(part.id);
        }}
        sx={{ flexGrow: 1, height: "100%" }}
        key={part.id}
      >
        {`${part.part_type?.name} - ${part.description} (${part.part_number})`}
      </StyledToggleButton>
    </Grid>
  );

  return (
    <Box sx={{ mt: 6 }}>
      <Typography variant="h6" fontWeight="bold">
        Parts Used
      </Typography>
      <Grid container sx={{ mt: 3 }}>
        <Grid container item xs={12}>
          <Grid container item spacing={2}>
            {partsList.data
              ?.filter((p: Part) => p.in_use)
              .map((p: Part) => {
                if (visiblePartIDs.some((x) => x == p.id)) {
                  return <PartToggleButton part={p} />;
                }
              })}
          </Grid>
        </Grid>
        <Grid item xs={12} sm={4} sx={{ mt: 2, mr: 2 }}>
          <FormControl size="small" fullWidth>
            <InputLabel>Add Other Parts</InputLabel>
            <Select
              value={""}
              label="Add Other Parts"
              onChange={(event: any) => {
                setVisiblePartIDs(
                  produce(visiblePartIDs, (newParts) => {
                    newParts.push(event.target.value);
                  }),
                );
                selectPart(event.target.value);
              }}
            >
              {partsList.data
                ?.filter((p: Part) => p.in_use)
                .map((p: Part) => {
                  if (!visiblePartIDs.some((x) => x == p.id)) {
                    return (
                      <MenuItem
                        key={p.id}
                        value={p.id}
                      >{`${p.description} (${p.part_number})`}</MenuItem>
                    );
                  }
                })}
            </Select>
          </FormControl>
        </Grid>
      </Grid>
    </Box>
  );
}
