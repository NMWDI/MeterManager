import { useEffect, useState } from "react";
import { Grid } from "@mui/material";
import { BackgroundBox } from "@/components";
import { Well } from "@/interfaces";

import { WellsTable } from "./WellsTable";
import { WellDetailsCard } from "./WellDetailsCard";

export const WellManagementView = () => {
  const [wellAddMode, setWellAddMode] = useState<boolean>(true);
  const [selectedWell, setSelectedWell] = useState<Well>();

  useEffect(() => {
    if (selectedWell) setWellAddMode(false);
  }, [selectedWell]);

  return (
    <BackgroundBox>
      <Grid container spacing={2}>
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
};
