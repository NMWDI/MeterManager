import {
  Assessment,
  Build,
  FormatListBulletedOutlined,
  MonitorHeart,
  People,
  Plumbing,
  Science,
} from "@mui/icons-material";
import { Box, Card, CardContent } from "@mui/material";
import { NavLink } from "../../components/NavLink";
import { BackgroundBox } from "../../components/BackgroundBox";
import { CustomCardHeader } from "../../components/CustomCardHeader";

export const ReportsView = () => {
  return (
    <BackgroundBox>
      <Card sx={{ height: "fit-content" }}>
        <CustomCardHeader title="Reports" icon={Assessment} />
        <CardContent>
          <Box sx={{ minWidth: "15rem", maxWidth: "15%" }} py={1}>
            <NavLink
              disabled
              route="/reports/workorders"
              label="Work Orders"
              Icon={FormatListBulletedOutlined}
            />
            <NavLink
              disabled
              route="/reports/wells"
              label="Monitoring Wells"
              Icon={MonitorHeart}
            />
            <NavLink
              disabled
              route="/reports/repairs"
              label="Repairs"
              Icon={Plumbing}
            />
            <NavLink
              route="/reports/partsused"
              label="Parts Used"
              Icon={Build}
            />
            <NavLink
              disabled
              route="/reports/board"
              label="Board"
              Icon={People}
            />
            <NavLink
              disabled
              route="/reports/chlorides"
              label="Chlorides"
              Icon={Science}
            />
          </Box>
        </CardContent>
      </Card>
    </BackgroundBox>
  );
};
