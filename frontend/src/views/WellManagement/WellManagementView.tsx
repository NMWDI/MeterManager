import { Grid } from "@mui/material";
import { useEffect, useState } from "react";
import { WellsTable } from "./WellsTable";
import { Well } from "../../interfaces";
import { WellDetailsCard } from "./WellDetailsCard";
import { BackgroundBox } from "../../components/BackgroundBox";

export default function WellManagementView() {
  const [wellAddMode, setWellAddMode] = useState<boolean>(true);
  const [selectedWell, setSelectedWell] = useState<Well>();

  useEffect(() => {
    if (selectedWell) setWellAddMode(false);
  }, [selectedWell]);

  return (
    <BackgroundBox>
      <Grid
        container
        spacing={2}
      >
        <Grid item xs={12} lg={7}>
          <WellsTable
            setSelectedWell={setSelectedWell}
            setWellAddMode={setWellAddMode}
          />
        </Grid>
        <Grid item xs={12} lg={5}>
          <WellDetailsCard
            selectedWell={selectedWell}
            wellAddMode={wellAddMode}
          />
        </Grid>
      </Grid>
    </BackgroundBox>
  );
}
