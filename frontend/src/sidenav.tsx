import { useEffect, useState } from "react";
import { useAuthUser } from "react-auth-kit";
import { Box, Drawer, Grid, IconButton, Toolbar, Typography } from "@mui/material";
import { createSearchParams, useNavigate } from "react-router-dom";
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
  const userId = authUser()?.id;
  const roleId = authUser()?.user_role_id;
  const [workOrderCount, setWorkOrderCount] = useState(0);
  const openWorkOrdersQuery = useGetWorkOrders([WorkOrderStatus.Open], {
    refetchInterval: 45_000,
    refetchIntervalInBackground: true,
    enabled: hasReadScope && !!authUser()
  });

  useEffect(() => {
    if (openWorkOrdersQuery.data && userId) {
      setWorkOrderCount(openWorkOrdersQuery.data.filter(
        (workOrder: WorkOrder) => workOrder.assigned_user_id === userId
      )?.length ?? 0);
    }
  }, [openWorkOrdersQuery.data, userId]);

  return (
    <Drawer
      variant="temporary"
      anchor="left"
      open={open}
      onClose={onClose}
      ModalProps={{
        keepMounted: true, // improves performance on mobile
      }}
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
              route={{
                pathname: "/workorders",
                search: createSearchParams({
                  userId: userId.toString(),
                  roleId: roleId.toString(),
                }).toString(),
              }}
              label="Work Orders"
              Icon={FormatListBulletedOutlined}
              badgeContent={workOrderCount} />
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
