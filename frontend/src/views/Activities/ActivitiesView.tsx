import { CardContent, Card } from "@mui/material";
import MeterActivityEntry from "./MeterActivityEntry/MeterActivityEntry";
import { Engineering } from "@mui/icons-material";
import { BackgroundBox, CustomCardHeader } from "@/components";

export const ActivitiesView = () => {
  return (
    <BackgroundBox>
      <Card sx={{ height: "fit-content" }}>
        <CustomCardHeader title="Activities" icon={Engineering} />
        <CardContent>
          <MeterActivityEntry />
        </CardContent>
      </Card>
    </BackgroundBox>
  );
};
