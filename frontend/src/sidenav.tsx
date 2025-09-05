import { useEffect, useState } from "react";
import { useAuthUser } from "react-auth-kit";
import {
  Box,
  Collapse,
  Drawer,
  Grid,
  IconButton,
  List,
  ListSubheader,
  Toolbar,
  Typography
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import {
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
import {
  NavLink,
  ReportsNavItem,
  RoleChip
} from "./components";
import { useGetWorkOrders } from "./service/ApiServiceNew";
import { WorkOrderStatus } from "./enums";
import { SecurityScope, WorkOrder } from "./interfaces";

export default function Sidenav({
  open,
  drawerWidth,
  onClose,
}: {
  open: boolean;
  drawerWidth: number;
  onClose: () => void;
}) {
  const [openReportsMenu, setOpenReportsMenu] = useState(true);
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
        <List
          subheader={
            <ListSubheader component="div">
              Pages
            </ListSubheader>
          }>
          <NavLink route="/" label="Home" icon={Home} />
          {hasReadScope && (
            <>
              <ListSubheader component="div" hidden={true}>
                <RoleChip role="Technician" /> Pages
              </ListSubheader>
              <NavLink
                route="/workorders"
                label="Work Orders"
                icon={FormatListBulletedOutlined}
                badgeContent={workOrderCount} />
              <NavLink
                route="/meters"
                label="Meters Information"
                icon={ScreenshotMonitor}
              />
              <NavLink route="/activities" label="Activities" icon={Construction} />
              <NavLink route="/wells" label="Monitoring Wells" icon={MonitorHeart} />
              <NavLink route="/wellmanagement" label="Manage Wells" icon={Plumbing} />
              <ReportsNavItem open={openReportsMenu} setOpen={setOpenReportsMenu} />
              <Collapse in={openReportsMenu} timeout="auto" unmountOnExit>
                <List disablePadding dense>
                  <NavLink
                    subItem
                    route="/reports/wells"
                    label="Monitoring Wells"
                    icon={MonitorHeart}
                  />
                  <NavLink
                    subItem
                    route="/reports/maintenance"
                    label="Maintenance"
                    icon={Plumbing}
                  />
                  <NavLink
                    subItem
                    route="/reports/partsused"
                    label="Parts Used"
                    icon={Build}
                  />
                  <NavLink
                    subItem
                    route="/reports/chlorides"
                    label="Chlorides"
                    icon={Science}
                  />
                </List>
              </Collapse>
            </>
          )}
          {hasAdminScope && (
            <>
              <ListSubheader component="div">
                <RoleChip role="Admin" /> Pages
              </ListSubheader>
              <NavLink route="/parts" label="Manage Parts" icon={Build} />
              <NavLink route="/usermanagement" label="Manage Users" icon={People} />
              <NavLink route="/chlorides" label="Chlorides" icon={Science} />
            </>
          )}
        </List>
      </Grid>
    </Drawer>
  );
}
