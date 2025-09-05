import {
  Assessment,
  Build,
  MonitorHeart,
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
            {/*
            <NavLink
              disabled
              route="/reports/workorders"
              label="Work Orders"
              Icon={FormatListBulletedOutlined}
            />
            */}
            <NavLink
              route="/reports/wells"
              label="Monitoring Wells"
              icon={MonitorHeart}
            />
            <NavLink
              route="/reports/maintenance"
              label="Maintenance"
              icon={Plumbing}
            />
            <NavLink
              route="/reports/partsused"
              label="Parts Used"
              icon={Build}
            />
            {/*
            <NavLink
              disabled
              route="/reports/board"
              label="Board"
              Icon={People}
            />
            */}
            <NavLink
              route="/reports/chlorides"
              label="Chlorides"
              icon={Science}
            />
          </Box>
        </CardContent>
      </Card>
    </BackgroundBox>
  );
};
