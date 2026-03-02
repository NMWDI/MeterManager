import { Grid } from "@mui/material";
import { Route } from "@/routes/manage/wells";
import { BackgroundBox } from "@/components";

import { WellDetailsCard } from "@/views/WellManagement/WellDetailsCard";
import { WellsTable } from "@/views/WellManagement/WellsTable";
import { useGetWellById } from "@/service";

export const WellManagementView = () => {
  const search = Route.useSearch();
  const selectedWellQuery = useGetWellById(search.well_id);

  return (
    <BackgroundBox>
      <Grid container spacing={2}>
        <Grid item xs={12} lg={7}>
          <WellsTable />
        </Grid>
        <Grid item xs={12} lg={5}>
          <WellDetailsCard
            selectedWell={selectedWellQuery?.data}
            wellAddMode={search.add}
          />
        </Grid>
      </Grid>
    </BackgroundBox>
  );
};
