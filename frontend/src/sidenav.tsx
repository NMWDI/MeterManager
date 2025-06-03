import { useEffect, useState } from "react";
import { useAuthUser } from "react-auth-kit";
import { Grid } from "@mui/material";
import { useGetWorkOrders } from "./service/ApiServiceNew";
import { WorkOrderStatus } from "./enums";
import { WorkOrder } from "./interfaces";
import {
  Assessment,
  Build,
  Construction,
  FormatListBulletedOutlined,
  Home,
  MonitorHeart,
  People,
  Plumbing,
  Science,
  ScreenshotMonitor,
} from "@mui/icons-material";
import { NavLink } from "./components/NavLink";

export default function Sidenav() {
  const authUser = useAuthUser();
  const hasAdminScope = authUser()
    ?.user_role.security_scopes.map((scope: any) => scope.scope_string)
    .includes("admin");
  const userID = authUser()?.id;

  const [workOrderLabel, setWorkOrderLabel] = useState("Work Orders");
  const workOrderList = useGetWorkOrders([WorkOrderStatus.Open]);

  useEffect(() => {
    if (workOrderList.data && userID) {
      let userWorkOrders = workOrderList.data.filter(
        (workOrder: WorkOrder) => workOrder.assigned_user_id == userID,
      );
      let numberOfWorkOrders = userWorkOrders.length;
      if (numberOfWorkOrders > 0) {
        setWorkOrderLabel(`Work Orders (${numberOfWorkOrders})`);
      } else {
        setWorkOrderLabel("Work Orders");
      }
    }
  }, [workOrderList.data, userID]);

  //Refresh work order list once a minute
  useEffect(() => {
    const interval = setInterval(() => {
      workOrderList.refetch();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Grid
      container
      direction="column"
      sx={{
        backgroundColor: "white",
        height: "103%",
        minHeight: "110vh",
        px: "1rem",
        boxShadow: "3px 5px 2px -2px rgba(0,0,0,0.2)",
      }}
    >
      <Grid item sx={{ mt: 3, mb: 1 }}>
        <h5 style={{ margin: 0, color: "#555555" }}>Pages</h5>
      </Grid>

      <NavLink route="/home" label="Home" Icon={Home} />
      <NavLink
        route="/workorders"
        label={workOrderLabel}
        Icon={FormatListBulletedOutlined}
      />
      <NavLink
        route="/meters"
        label="Meters Information"
        Icon={ScreenshotMonitor}
      />
      <NavLink route="/activities" label="Activities" Icon={Construction} />
      <NavLink route="/wells" label="Monitoring Wells" Icon={MonitorHeart} />
      <NavLink route="/wellmanagement" label="Manage Wells" Icon={Plumbing} />
      <NavLink route="/reports" label="Reports" Icon={Assessment} />

      {hasAdminScope && (
        <>
          <Grid item sx={{ mt: 3, mb: 1 }}>
            <h5 style={{ margin: 0, color: "#555555" }}>Admin Management</h5>
          </Grid>
          <NavLink route="/parts" label="Manage Parts" Icon={Build} />
          <NavLink route="/usermanagement" label="Manage Users" Icon={People} />
          <NavLink route="/chlorides" label="Chlorides" Icon={Science} />
        </>
      )}
    </Grid>
  );
}
