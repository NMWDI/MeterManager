import { CardContent, Card } from "@mui/material";
import MeterActivityEntry from "./MeterActivityEntry/MeterActivityEntry";
import { Construction } from "@mui/icons-material";
import { BackgroundBox, CustomCardHeader } from "@/components";

export const ActivitiesView = () => {
  return (
    <BackgroundBox>
      <Card sx={{ height: "fit-content" }}>
        <CustomCardHeader title="Submit an Activity" icon={Construction} />
        <CardContent>
          <MeterActivityEntry />
        </CardContent>
      </Card>
    </BackgroundBox>
  );
};
