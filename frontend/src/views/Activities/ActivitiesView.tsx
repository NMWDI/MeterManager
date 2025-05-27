import { Grid, CardContent, Card } from "@mui/material";
import MeterActivityEntry from "./MeterActivityEntry/MeterActivityEntry";
import { Construction } from "@mui/icons-material";
import { BackgroundBox } from "../../components/BackgroundBox";
import { CustomCardHeader } from "../../components/CustomCardHeader";

export const gridBreakpoints = { xs: 12 };
export const toggleStyle = {
  "&.Mui-selected": { borderColor: "blue", border: 1 },
};

export const ActivitiesView = () => {
  return (
    <BackgroundBox>
      <Card sx={{ height: "fit-content" }}>
        <CustomCardHeader title="Submit an Activity" icon={Construction} />
        <CardContent>
          <Grid container>
            <Grid item xs={11} sm={11} lg={8} xl={7}>
              <MeterActivityEntry />
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </BackgroundBox>
  );
};
