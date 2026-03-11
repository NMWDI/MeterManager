import { useEffect, useMemo, useState } from "react";
import { useAuthUser } from "react-auth-kit";
import {
  Badge,
  Box,
  ButtonBase,
  Collapse,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { SvgIconProps } from "@mui/material/SvgIcon";
import { useNavigate } from "@tanstack/react-router";
import {
  Assessment,
  ExpandLess,
  ExpandMore,
  TableView,
} from "@mui/icons-material";
import { useIsActiveRoute } from "@/hooks";
import { useGetWorkOrders } from "@/service";
import { WorkOrderStatus } from "@/enums";
import { SecurityScope, WorkOrder } from "@/interfaces";
import { navConfig } from "@/constants";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarHeaderCloseButton,
  SidebarMenu,
  SidebarMenuSub,
  SidebarTooltip,
  TOPBAR_HEIGHT,
} from "@/components/ui/sidebar";

const reportsMenuOpenStorageKey = "wmdb.sidebar.reports.open";

const readStoredReportsMenuOpen = () => {
  if (typeof window === "undefined") return true;

  const raw = window.localStorage.getItem(reportsMenuOpenStorageKey);
  if (raw === null) return true;
  return raw === "true";
};

type NavButtonProps = {
  route?: string;
  label: string;
  icon?: React.ComponentType<SvgIconProps>;
  badgeContent?: number;
  subItem?: boolean;
  collapsed?: boolean;
  disabled?: boolean;
  onClick: () => void;
  trailing?: React.ReactNode;
};

function SidebarNavButton({
  route,
  label,
  icon: Icon,
  badgeContent,
  subItem = false,
  collapsed = false,
  disabled = false,
  onClick,
  trailing,
}: NavButtonProps) {
  const active = route ? useIsActiveRoute(route) : false;
  const iconNode = Icon ? (
    <Icon fontSize="small" />
  ) : (
    <TableView fontSize="small" />
  );
  const content = (
    <ButtonBase
      onClick={onClick}
      disabled={disabled}
      sx={{
        width: "100%",
        justifyContent: collapsed ? "center" : "flex-start",
        textAlign: "left",
        px: collapsed ? 0 : subItem ? 1 : 0.875,
        py: collapsed ? 0 : 0.625,
        minHeight: collapsed ? 44 : 40,
        borderRadius: collapsed ? "12px" : "12px",
        border: active
          ? "1px solid rgba(25, 118, 210, 0.18)"
          : "1px solid transparent",
        backgroundColor: active ? "rgba(37, 99, 235, 0.08)" : "transparent",
        color: disabled ? "text.disabled" : "text.primary",
        transition:
          "background-color 150ms ease, border-color 150ms ease, transform 150ms ease",
        "&:hover": {
          backgroundColor: active
            ? "rgba(37, 99, 235, 0.12)"
            : "rgba(15, 23, 42, 0.04)",
        },
      }}
    >
      <Box
        sx={{
          minWidth: collapsed ? 44 : 30,
          width: collapsed ? 44 : 30,
          height: collapsed ? 44 : 30,
          display: "grid",
          placeItems: "center",
          color: active ? "primary.main" : "text.secondary",
        }}
      >
        <Badge
          badgeContent={badgeContent}
          color="primary"
          invisible={!badgeContent || badgeContent === 0}
        >
          {iconNode}
        </Badge>
      </Box>
      {!collapsed ? (
        <>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: active ? 700 : 500,
                color: "inherit",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                lineHeight: 1.2,
              }}
            >
              {label}
            </Typography>
          </Box>
          {trailing}
        </>
      ) : null}
    </ButtonBase>
  );

  return collapsed ? (
    <SidebarTooltip title={label}>{content}</SidebarTooltip>
  ) : (
    content
  );
}

function ReportsSidebarButton({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  return (
    <SidebarNavButton
      label="Reports"
      route="/reports"
      onClick={() => setOpen((prev) => !prev)}
      trailing={
        <Box
          sx={{
            display: "grid",
            placeItems: "center",
            color: "text.secondary",
          }}
        >
          {open ? (
            <ExpandLess fontSize="small" />
          ) : (
            <ExpandMore fontSize="small" />
          )}
        </Box>
      }
      icon={Assessment}
    />
  );
}

export default function Sidenav({
  open,
  drawerWidth,
  onClose,
  onOpen,
  onWidthChange,
}: {
  open: boolean;
  drawerWidth: number;
  onClose: () => void;
  onOpen: () => void;
  onWidthChange: (width: number) => void;
}) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const [openReportsMenu, setOpenReportsMenu] = useState(
    readStoredReportsMenuOpen,
  );
  const navigate = useNavigate();
  const authUser = useAuthUser();

  const scopes: Set<string> = new Set(
    authUser()?.user_role?.security_scopes?.map(
      (scope: SecurityScope) => scope.scope_string,
    ) ?? [],
  );

  const hasReadScope = scopes.has("read");
  const hasAdminScope = scopes.has("admin");
  const userId = authUser()?.id;
  const [workOrderCount, setWorkOrderCount] = useState(0);

  const openWorkOrdersQuery = useGetWorkOrders(
    {
      filter_by_status: [WorkOrderStatus.Open],
    },
    {
      refetchInterval: 45_000,
      refetchIntervalInBackground: true,
      enabled: hasReadScope && !!authUser(),
    },
  );

  useEffect(() => {
    if (openWorkOrdersQuery.data && userId) {
      setWorkOrderCount(
        openWorkOrdersQuery.data.filter(
          (workOrder: WorkOrder) => workOrder.assigned_user_id === userId,
        )?.length ?? 0,
      );
    }
  }, [openWorkOrdersQuery.data, userId]);

  useEffect(() => {
    if (!isDesktop) {
      return;
    }

    setOpenReportsMenu(readStoredReportsMenuOpen());
  }, [isDesktop]);

  useEffect(() => {
    if (!isDesktop || typeof window === "undefined") return;
    window.localStorage.setItem(
      reportsMenuOpenStorageKey,
      String(openReportsMenu),
    );
  }, [isDesktop, openReportsMenu]);

  const visibleCollapsedItems = useMemo(
    () => [
      ...navConfig.filter((item) => !item.role),
      ...navConfig.filter((item) => item.role === "Technician" && !item.parent),
      ...navConfig.filter((item) => item.parent === "reports"),
      ...navConfig.filter((item) => item.role === "Admin"),
    ],
    [],
  );

  const handleNavigate = (route: string) => {
    navigate({ to: route, search: {} });
    if (!isDesktop) {
      onClose();
    }
  };

  const isCollapsedDesktop = isDesktop && !open;

  return (
    <Sidebar
      open={open}
      width={drawerWidth}
      onClose={onClose}
      onOpen={onOpen}
      onWidthChange={onWidthChange}
    >
      {isCollapsedDesktop ? (
        <>
          <SidebarHeader
            sx={{
              justifyContent: "center",
              px: 1,
              py: 1,
              height: TOPBAR_HEIGHT,
            }}
          >
            <SidebarHeaderCloseButton onClick={onOpen} direction="right" />
          </SidebarHeader>
          <SidebarContent
            sx={{
              mt: 1,
              p: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 0.5,
            }}
          >
            {visibleCollapsedItems
              .filter((item) => {
                if (!item.role) {
                  return true;
                }
                if (item.role === "Technician") {
                  return hasReadScope;
                }
                if (item.role === "Admin") {
                  return hasAdminScope;
                }
                return false;
              })
              .map((item, index) => (
                <Box key={`${item.path}-${index}`} sx={{ width: "100%" }}>
                  <SidebarNavButton
                    route={item.path}
                    label={item.label}
                    icon={item.icon}
                    collapsed
                    badgeContent={
                      item.path === "/workorders" ? workOrderCount : undefined
                    }
                    onClick={() => handleNavigate(item.path)}
                  />
                </Box>
              ))}
          </SidebarContent>
        </>
      ) : (
        <>
          <SidebarHeader
            sx={{
              px: { xs: 1.25, sm: 2 },
              py: 1,
              height: TOPBAR_HEIGHT,
            }}
          >
            <ButtonBase
              onClick={() => handleNavigate("/")}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.25,
                borderRadius: 2,
                pr: 1,
                textAlign: "left",
              }}
            ></ButtonBase>
            <SidebarHeaderCloseButton onClick={onClose} mobile={!isDesktop} />
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Pages</SidebarGroupLabel>
              <SidebarMenu>
                {navConfig
                  .filter((item) => !item.role)
                  .map((item) => (
                    <SidebarNavButton
                      key={item.path}
                      route={item.path}
                      label={item.label}
                      icon={item.icon}
                      onClick={() => handleNavigate(item.path)}
                    />
                  ))}
              </SidebarMenu>

              {hasReadScope ? (
                <SidebarMenu>
                  {navConfig
                    .filter(
                      (item) => item.role === "Technician" && !item.parent,
                    )
                    .map((item) => (
                      <SidebarNavButton
                        key={item.path}
                        route={item.path}
                        label={item.label}
                        icon={item.icon}
                        badgeContent={
                          item.path === "/workorders"
                            ? workOrderCount
                            : undefined
                        }
                        onClick={() => handleNavigate(item.path)}
                      />
                    ))}
                  <ReportsSidebarButton
                    open={openReportsMenu}
                    setOpen={setOpenReportsMenu}
                  />
                  <Collapse in={openReportsMenu} timeout="auto" unmountOnExit>
                    <SidebarMenuSub>
                      {navConfig
                        .filter((item) => item.parent === "reports")
                        .map((item) => (
                          <SidebarNavButton
                            key={item.path}
                            route={item.path}
                            label={item.label}
                            icon={item.icon}
                            subItem
                            onClick={() => handleNavigate(item.path)}
                          />
                        ))}
                    </SidebarMenuSub>
                  </Collapse>
                </SidebarMenu>
              ) : null}

              {hasAdminScope ? (
                <SidebarMenu>
                  {navConfig
                    .filter((item) => item.role === "Admin")
                    .map((item) => (
                      <SidebarNavButton
                        key={item.path}
                        route={item.path}
                        label={item.label}
                        icon={item.icon}
                        onClick={() => handleNavigate(item.path)}
                      />
                    ))}
                </SidebarMenu>
              ) : null}
            </SidebarGroup>
          </SidebarContent>
        </>
      )}
    </Sidebar>
  );
}
