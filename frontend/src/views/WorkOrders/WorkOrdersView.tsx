import { Card, CardContent } from "@mui/material";
import FormatListBulletedOutlinedIcon from "@mui/icons-material/FormatListBulletedOutlined";
import WorkOrdersTable from "./WorkOrdersTable";
import { BackgroundBox } from "../../components/BackgroundBox";
import { CustomCardHeader } from "../../components/CustomCardHeader";

export default function WorkOrdersView() {
  return (
    <BackgroundBox>
      <Card sx={{ height: "fit-content" }}>
        <CustomCardHeader
          title="Work Orders"
          icon={FormatListBulletedOutlinedIcon}
        />
        <CardContent>
          <WorkOrdersTable />
        </CardContent>
      </Card>
    </BackgroundBox>
  );
}
