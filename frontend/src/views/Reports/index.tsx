import {
  AssessmentOutlined,
  BuildOutlined,
  ConstructionOutlined,
  EngineeringOutlined,
  MonitorHeartOutlined,
  ScienceOutlined,
  SellOutlined,
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
            <NavLink
              route="/reports/installedmeters"
              label="Installed Meters"
              icon={EngineeringOutlined}
            />
            <NavLink
              route="/reports/soldmeters"
              label="Sold Meters"
              icon={SellOutlined}
            />
          </Box>
        </CardContent>
      </Card>
    </BackgroundBox>
  );
};
