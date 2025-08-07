import { useEffect, useState } from "react";
import { useAuthUser } from "react-auth-kit";
import { Grid, Typography } from "@mui/material";
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

  const generalNav = [
    { route: "/home", label: "Home", Icon: Home },
    { route: "/workorders", label: workOrderLabel, Icon: FormatListBulletedOutlined },
    { route: "/meters", label: "Meters Information", Icon: ScreenshotMonitor },
    { route: "/activities", label: "Activities", Icon: Construction },
    { route: "/wells", label: "Monitoring Wells", Icon: MonitorHeart },
    { route: "/wellmanagement", label: "Manage Wells", Icon: Plumbing },
    { route: "/reports", label: "Reports", Icon: Assessment },
  ];

  const adminNav = [
    { route: "/parts", label: "Manage Parts", Icon: Build },
    { route: "/usermanagement", label: "Manage Users", Icon: People },
    { route: "/chlorides", label: "Chlorides", Icon: Science },
  ];

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
        <Typography
          variant="h5"
          style={{ margin: 0, color: "#555555", fontSize: '13.28px', fontWeight: 700 }}
        >Pages</Typography>
      </Grid>
      {generalNav.map(({ route, label, Icon }) => (
        <NavLink key={route} route={route} label={label} Icon={Icon} />
      ))}
      {hasAdminScope && (
        <>
          <Grid item sx={{ mt: 3, mb: 1 }}>
            <Typography
              variant="h5"
              style={{ margin: 0, color: "#555555", fontSize: '13.28px', fontWeight: 700 }}
            >Admin Management</Typography>
          </Grid>
          {adminNav.map(({ route, label, Icon }) => (
            <NavLink key={route} route={route} label={label} Icon={Icon} />
          ))}
        </>
      )}
    </Grid>
  );
}
