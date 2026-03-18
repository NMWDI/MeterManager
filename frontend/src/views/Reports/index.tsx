import {
  AssessmentOutlined,
  BuildOutlined,
  ConstructionOutlined,
  MonitorHeartOutlined,
  ScienceOutlined,
} from "@mui/icons-material";
import { Box, Card, CardContent } from "@mui/material";
import { BackgroundBox, CustomCardHeader, NavLink } from "@/components";

export const ReportsView = () => {
  return (
    <BackgroundBox>
      <Card sx={{ height: "fit-content" }}>
        <CustomCardHeader title="Reports" icon={AssessmentOutlined} />
        <CardContent>
          <Box sx={{ minWidth: "15rem", maxWidth: "15%" }} py={1}>
            <NavLink
              route="/reports/chlorides"
              label="Chlorides"
              icon={ScienceOutlined}
            />
            <NavLink
              route="/reports/monitoringwells"
              label="Monitoring Wells"
              icon={MonitorHeartOutlined}
            />
            <NavLink
              route="/reports/maintenance"
              label="Maintenance"
              icon={ConstructionOutlined}
            />
            <NavLink
              route="/reports/partsused"
              label="Parts Used"
              icon={BuildOutlined}
            />
          </Box>
        </CardContent>
      </Card>
    </BackgroundBox>
  );
};
