import { useEffect, useState } from "react";
import { useAuthUser } from "react-auth-kit";
import { Box, Drawer, Grid, IconButton, Toolbar, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useGetWorkOrders } from "./service/ApiServiceNew";
import { WorkOrderStatus } from "./enums";
import { SecurityScope, WorkOrder } from "./interfaces";
import {
  Assessment,
  Build,
  ChevronLeft,
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

export default function Sidenav({
  open,
  drawerWidth,
  onClose,
}: {
  open: boolean;
  drawerWidth: number;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const authUser = useAuthUser();

  // Normalize scopes into a Set for O(1) lookups
  const scopes: Set<string> = new Set(
    authUser()?.user_role?.security_scopes?.map(
      (scope: SecurityScope) => scope.scope_string
    ) ?? []
  );

  const hasReadScope = scopes.has("read");
  const hasAdminScope = scopes.has("admin");
  const userID = authUser()?.id;

  const [workOrderLabel, setWorkOrderLabel] = useState("Work Orders");
  const workOrderList = useGetWorkOrders([WorkOrderStatus.Open], {
    refetchInterval: 45_000,
    refetchIntervalInBackground: true,
    enabled: hasReadScope && !!authUser()
  });

  useEffect(() => {
    if (workOrderList.data && userID) {
      const userWorkOrders = workOrderList.data.filter(
        (workOrder: WorkOrder) => workOrder.assigned_user_id === userID
      );
      setWorkOrderLabel(
        userWorkOrders.length > 0
          ? `Work Orders (${userWorkOrders.length})`
          : "Work Orders"
      );
    }
  }, [workOrderList.data, userID]);

  return (
    <Drawer
      variant="persistent"
      anchor="left"
      open={open}
      sx={{
        flexShrink: 0,
        width: open ? drawerWidth : 0,
        "& .MuiDrawer-paper": {
          width: drawerWidth,
          boxSizing: "border-box",
          backgroundColor: "white",
          overflowY: "hidden",
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography
          variant="h6"
          noWrap
          sx={{
            color: "darkblue",
            cursor: "pointer",
            fontWeight: "bold",
            ml: 2,
            fontSize: {
              sx: "1rem",
              md: "1.25rem",
              lg: "1.5rem",
              xl: "1.625remrem",
            },
          }}
          onClick={() => navigate("/")}
        >
          Meter Manager
        </Typography>
        <Toolbar
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            px: [1],
          }}
        >
          <IconButton onClick={onClose} sx={{ color: "darkblue" }}>
            <ChevronLeft />
          </IconButton>
        </Toolbar>
      </Box>

      {/* Nav Items */}
      <Grid
        container
        direction="column"
        sx={{
          height: "100%",
          px: "1rem",
        }}
      >
        <Grid item sx={{ mt: 2, mb: 1 }}>
          <h5 style={{ margin: 0, color: "#555555" }}>Pages</h5>
        </Grid>

        <NavLink route="/" label="Home" Icon={Home} />

        {hasReadScope && (
          <>
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
          </>
        )}

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
    </Drawer>
  );
}
