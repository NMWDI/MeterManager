import { Card, CardContent } from "@mui/material";
import { FormatListBulletedOutlined } from "@mui/icons-material";
import { BackgroundBox, CustomCardHeader } from "@/components";

import WorkOrdersTable from "./WorkOrdersTable";

export const WorkOrdersView = () => {
  return (
    <BackgroundBox>
      <Card sx={{ height: "fit-content", overflowX: "auto" }}>
        <CustomCardHeader
          title="Work Orders"
          icon={FormatListBulletedOutlined}
        />
        <CardContent>
          <WorkOrdersTable />
        </CardContent>
      </Card>
    </BackgroundBox>
  );
};
