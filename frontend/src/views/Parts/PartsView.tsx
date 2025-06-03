import { useEffect, useState } from "react";
import { PartsTable } from "./PartsTable";
import { Grid } from "@mui/material";
import { PartDetailsCard } from "./PartDetailsCard";
import { MeterTypesTable } from "./MeterTypesTable";
import { MeterTypeDetailsCard } from "./MeterTypeDetailsCard";
import { MeterTypeLU } from "../../interfaces";
import { BackgroundBox } from "../../components/BackgroundBox";

export const PartsView = () => {
  const [selectedPartID, setSelectedPartID] = useState<number>();
  const [partAddMode, setPartAddMode] = useState<boolean>(true);
  const [selectedMeterType, setSelectedMeterType] = useState<MeterTypeLU>();
  const [meterTypeAddMode, setMeterTypeAddMode] = useState<boolean>(true);

  // Exit add mode when part is selected from table
  useEffect(() => {
    if (selectedPartID) setPartAddMode(false);
  }, [selectedPartID]);

  useEffect(() => {
    if (selectedMeterType) setMeterTypeAddMode(false);
  }, [selectedMeterType]);

  return (
    <BackgroundBox>
      <Grid container spacing={4}>
        <Grid
          container
          item
          spacing={2}
          sx={{ minHeight: { xs: "100vh", lg: "70vh" } }}
        >
          <Grid item xs={8}>
            <PartsTable
              setSelectedPartID={setSelectedPartID}
              setPartAddMode={setPartAddMode}
            />
          </Grid>
          <Grid item xs={4}>
            <PartDetailsCard
              selectedPartID={selectedPartID}
              partAddMode={partAddMode}
            />
          </Grid>
        </Grid>
        <Grid
          container
          item
          spacing={2}
          sx={{ minHeight: { xs: "100vh", lg: "70vh" }, mt: -4 }}
        >
          <Grid item xs={8}>
            <MeterTypesTable
              setSelectedMeterType={setSelectedMeterType}
              setMeterTypeAddMode={setMeterTypeAddMode}
            />
          </Grid>
          <Grid item xs={4}>
            <MeterTypeDetailsCard
              selectedMeterType={selectedMeterType}
              meterTypeAddMode={meterTypeAddMode}
            />
          </Grid>
        </Grid>
      </Grid>
    </BackgroundBox>
  );
};
