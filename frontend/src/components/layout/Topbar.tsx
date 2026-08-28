import { MouseEvent, useState } from "react";
import {
  AppBar,
  Badge,
  Box,
  Button,
  Divider,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
  SxProps,
  Theme,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { enqueueSnackbar } from "notistack";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import {
  ExpandMore,
  AdminPanelSettingsOutlined,
  Home,
  Logout,
  MonitorHeart,
  NotificationsOutlined,
  Public,
  Science,
  Settings,
  SwapHoriz,
} from "@mui/icons-material";
import { useNavigate } from "@tanstack/react-router";
import { useAuthUser, useSignIn, useSignOut } from "react-auth-kit";
import { TopbarUserButton, UserAvatar } from "@/components";
import {
  DESKTOP_COLLAPSED_WIDTH,
  TOPBAR_HEIGHT,
} from "@/components/ui/sidebar";
import { BgColor } from "@/constants";
import { useIsActiveRoute } from "@/hooks";
import { useGetUnreadNotificationCount } from "@/service";
import {
  clearTrackedSession,
  collectSessionTrackingMetadata,
  notifyTrackedLogout,
} from "@/utils/SessionTracking";
import {
  clearStoredImpersonation,
  endImpersonationSession,
  getStoredImpersonation,
} from "@/utils/Impersonation";

export const Topbar = ({
  open,
  sidebarWidth,
  onMenuClick,
  sx,
}: {
  open: boolean;
  sidebarWidth: number;
  onMenuClick: () => void;
  sx?: SxProps<Theme>;
}) => {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const navigate = useNavigate();
  const signOut = useSignOut();
  const signIn = useSignIn();
  const authUser = useAuthUser();
  const isHomeActive = useIsActiveRoute("/");
  const isChloridesActive = useIsActiveRoute("/chlorides");
  const isMonitoringWellsActive = useIsActiveRoute("/monitoringwells");
  const isNotificationsActive = useIsActiveRoute("/notifications");
  const isSettingsActive = useIsActiveRoute("/settings");
  const isAdminActionsActive = useIsActiveRoute("/admin-actions");

  const [userMenuAnchorEl, setUserMenuAnchorEl] = useState<null | HTMLElement>(
    null,
  );
  const [publicMenuAnchorEl, setPublicMenuAnchorEl] =
    useState<null | HTMLElement>(null);

  const user = authUser();
  const impersonation = getStoredImpersonation();
  const role: string = user?.user_role?.name;
  const fullName = user?.full_name ?? user?.display_name ?? "Unknown";
  const displayName = user?.display_name ?? "Unknown";
  const email = user?.email ?? "No email available";
  const isLoggedIn = !!user;
  const isImpersonating = !!impersonation;
  const isAdmin =
    user?.user_role?.security_scopes?.some(
      (scope: { scope_string: string }) => scope.scope_string === "admin",
    ) ?? false;
  const impersonationLabel =
    impersonation?.impersonatedUser.full_name ?? user?.full_name ?? "Unknown User";
  const impersonatorLabel =
    impersonation?.actorUser.display_name ??
    impersonation?.actorUser.full_name ??
    "Unknown Admin";
  const unreadNotificationsQuery = useGetUnreadNotificationCount({
    enabled: isLoggedIn,
  });
  const unreadNotificationCount =
    unreadNotificationsQuery.data?.unread_count ?? 0;
  const isPublicDataActive = isChloridesActive || isMonitoringWellsActive;
  const effectiveSidebarWidth =
    isDesktop && isLoggedIn
      ? open
        ? sidebarWidth
        : DESKTOP_COLLAPSED_WIDTH
      : 0;

  const handleMenuOpen = (event: MouseEvent<HTMLElement>) => {
    setUserMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setUserMenuAnchorEl(null);
  };

  const handlePublicMenuOpen = (event: MouseEvent<HTMLElement>) => {
    setPublicMenuAnchorEl(event.currentTarget);
  };

  const handlePublicMenuClose = () => {
    setPublicMenuAnchorEl(null);
  };

  const handlePublicMenuToggle = (event: MouseEvent<HTMLElement>) => {
    if (publicMenuAnchorEl) {
      handlePublicMenuClose();
      return;
    }

    handlePublicMenuOpen(event);
  };

  const fullSignOut = async () => {
    await notifyTrackedLogout("manual_logout");
    navigate({ to: "/", search: {} });
    localStorage.removeItem("loggedIn");
    localStorage.removeItem("_auth");
    clearTrackedSession();
    clearStoredImpersonation();
    signOut();
  };

  const stopImpersonating = async () => {
    const sessionTrackingMetadata = await collectSessionTrackingMetadata();
    await notifyTrackedLogout("manual_logout");

    const restored = endImpersonationSession({
      signIn,
      fingerprintHash: sessionTrackingMetadata.fingerprintHash,
    });

    if (!restored) {
      clearStoredImpersonation();
      localStorage.removeItem("loggedIn");
      localStorage.removeItem("_auth");
      clearTrackedSession();
      signOut();
      navigate({ to: "/login", search: {} });
      enqueueSnackbar("Failed to restore the original admin session.", {
        variant: "error",
      });
      return;
    }

    enqueueSnackbar("Returned to the original admin session.", {
      variant: "success",
    });
    navigate({ to: "/manage/users", search: {} });
  };

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        ...sx,
        width: isDesktop ? `calc(100% - ${effectiveSidebarWidth}px)` : "100%",
        ml: isDesktop ? `${effectiveSidebarWidth}px` : 0,
        backgroundColor: BgColor,
        borderBottom: "1px solid",
        borderColor: "divider",
        backdropFilter: "blur(14px)",
        boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
        transition: "width 180ms ease, margin-left 180ms ease",
      }}
    >
      <Toolbar
        sx={{
          justifyContent: "space-between",
          minHeight: TOPBAR_HEIGHT,
          px: { xs: 1.25, sm: 2 },
          py: { xs: 0.75, sm: 1 },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", minWidth: 0 }}>
          {!isDesktop ? (
            <IconButton
              edge="start"
              color="inherit"
              onClick={onMenuClick}
              sx={{
                mr: 1,
                ml: 0.5,
                color: "darkblue",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 3,
                width: 44,
                height: 44,
              }}
            >
              {open ? <CloseIcon /> : <MenuIcon />}
            </IconButton>
          ) : null}

          <Box
            sx={{
              ml: isDesktop ? 0 : 0.5,
              minWidth: 0,
            }}
          >
            <Typography
              variant="h6"
              noWrap
              sx={{
                color: "darkblue",
                cursor: "pointer",
                fontWeight: 800,
                lineHeight: 1.1,
                fontSize: { xs: "1.1rem", sm: "1.2rem", md: "1.3rem" },
              }}
              onClick={() => navigate({ to: "/", search: {} })}
            >
              Meter Manager
            </Typography>
          </Box>
        </Box>

        {isDesktop && !isLoggedIn ? (
          <Box
            sx={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <Button
              color="inherit"
              startIcon={<Home fontSize="small" />}
              onClick={() => navigate({ to: "/", search: {} })}
              sx={{
                color: isHomeActive ? "darkblue" : "text.secondary",
                fontWeight: 700,
                textTransform: "none",
                transition: "color 180ms ease",
              }}
            >
              Home
            </Button>
            <Button
              color="inherit"
              startIcon={<Public fontSize="small" />}
              endIcon={
                <ExpandMore
                  fontSize="small"
                  sx={{
                    transform: publicMenuAnchorEl
                      ? "translateY(-1px) rotate(180deg)"
                      : "translateY(1px) rotate(0deg)",
                    transition:
                      "transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1) 70ms",
                  }}
                />
              }
              onClick={handlePublicMenuToggle}
              onMouseEnter={handlePublicMenuOpen}
              sx={{
                color: isPublicDataActive ? "darkblue" : "text.secondary",
                fontWeight: 700,
                textTransform: "none",
                transition: "color 180ms ease",
              }}
            >
              Public Data
            </Button>
            <Menu
              anchorEl={publicMenuAnchorEl}
              open={Boolean(publicMenuAnchorEl)}
              onClose={handlePublicMenuClose}
              anchorOrigin={{ horizontal: "center", vertical: "bottom" }}
              transformOrigin={{ horizontal: "center", vertical: "top" }}
              MenuListProps={{
                onMouseLeave: handlePublicMenuClose,
              }}
            >
              <MenuItem
                selected={isChloridesActive}
                onClick={() => {
                  navigate({ to: "/chlorides", search: {} });
                  handlePublicMenuClose();
                }}
                sx={{
                  color: isChloridesActive ? "darkblue" : "text.primary",
                  "& .MuiListItemIcon-root": {
                    color: isChloridesActive ? "darkblue" : "action.active",
                  },
                }}
              >
                <ListItemIcon>
                  <Science fontSize="small" />
                </ListItemIcon>
                <Typography variant="body1">Chlorides</Typography>
              </MenuItem>
              <MenuItem
                selected={isMonitoringWellsActive}
                onClick={() => {
                  navigate({ to: "/monitoringwells", search: {} });
                  handlePublicMenuClose();
                }}
                sx={{
                  color: isMonitoringWellsActive ? "darkblue" : "text.primary",
                  "& .MuiListItemIcon-root": {
                    color: isMonitoringWellsActive
                      ? "darkblue"
                      : "action.active",
                  },
                }}
              >
                <ListItemIcon>
                  <MonitorHeart fontSize="small" />
                </ListItemIcon>
                <Typography variant="body1">Monitoring Wells</Typography>
              </MenuItem>
            </Menu>
          </Box>
        ) : null}

        {isLoggedIn && isImpersonating ? (
          <Box
            sx={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              alignItems: "center",
              gap: 1,
              px: 1.5,
              py: 0.75,
              borderRadius: 999,
              border: "1px solid rgba(0, 0, 139, 0.18)",
              backgroundColor: "rgba(0, 0, 139, 0.08)",
            }}
          >
            <SwapHoriz fontSize="small" sx={{ color: "darkblue" }} />
            <Typography
              variant="body2"
              sx={{ color: "darkblue", fontWeight: 700, whiteSpace: "nowrap" }}
            >
              Impersonating {impersonationLabel} as {impersonatorLabel}
            </Typography>
          </Box>
        ) : null}

        {isLoggedIn ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <IconButton
              size="small"
              onClick={() => navigate({ to: "/notifications", search: {} })}
              sx={{
                width: { xs: 35, md: 40, lg: 44 },
                height: { xs: 35, md: 40, lg: 44 },
                color: isNotificationsActive ? "darkblue" : "text.secondary",
                border: isNotificationsActive ? "1px solid" : undefined,
                borderColor: isNotificationsActive
                  ? "rgba(0, 0, 139, 0.24)"
                  : undefined,
                bgcolor: isNotificationsActive
                  ? "rgba(0, 0, 139, 0.08)"
                  : undefined,
                "&:hover": {
                  bgcolor: isNotificationsActive
                    ? "rgba(0, 0, 139, 0.14)"
                    : undefined,
                },
              }}
            >
              <Badge
                badgeContent={unreadNotificationCount}
                color="error"
                overlap="circular"
                max={99}
              >
                <NotificationsOutlined fontSize="small" />
              </Badge>
            </IconButton>
            <TopbarUserButton
              role={role}
              full_name={fullName}
              onClick={handleMenuOpen}
              src={user?.avatar_img}
            />
            <Menu
              anchorEl={userMenuAnchorEl}
              open={Boolean(userMenuAnchorEl)}
              onClose={handleMenuClose}
              transformOrigin={{ horizontal: "right", vertical: "top" }}
              anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
              slotProps={{
                paper: {
                  sx: {
                    mt: 1,
                    minWidth: 280,
                    borderRadius: 3,
                    border: "1px solid",
                    borderColor: "divider",
                    boxShadow: "0 18px 44px rgba(15, 23, 42, 0.14)",
                  },
                },
              }}
              MenuListProps={{
                dense: true,
                sx: {
                  py: 0,
                },
              }}
            >
              <Box
                sx={{
                  px: 1.5,
                  py: 1.25,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 1.25,
                }}
              >
                <UserAvatar
                  full_name={fullName}
                  role={role}
                  src={user?.avatar_img}
                  size={42}
                  sx={{ flexShrink: 0 }}
                />
                <Box
                  sx={{
                    minWidth: 0,
                    overflow: "hidden",
                  }}
                >
                  <Typography
                    sx={{
                      fontWeight: 700,
                      fontSize: "0.96rem",
                      lineHeight: 1.2,
                    }}
                    noWrap
                  >
                    {displayName}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      display: "block",
                      mt: 0.25,
                      fontSize: "0.75rem",
                    }}
                    noWrap
                  >
                    {email}
                  </Typography>
                </Box>
              </Box>
              <Divider />
              <MenuItem
                selected={isSettingsActive}
                onClick={() => {
                  navigate({ to: "/settings", search: {} });
                  handleMenuClose();
                }}
                sx={{ minHeight: 36, gap: 1, px: 1.5 }}
              >
                <ListItemIcon>
                  <Settings fontSize="small" />
                </ListItemIcon>
                <Typography variant="body2" fontWeight={500}>
                  Settings
                </Typography>
              </MenuItem>
              <MenuItem
                selected={isNotificationsActive}
                onClick={() => {
                  navigate({ to: "/notifications", search: {} });
                  handleMenuClose();
                }}
                sx={{ minHeight: 36, gap: 1, px: 1.5 }}
              >
                <ListItemIcon>
                  <NotificationsOutlined fontSize="small" />
                </ListItemIcon>
                <Typography variant="body2" fontWeight={500}>
                  Notifications
                </Typography>
              </MenuItem>
              {isAdmin ? (
                <MenuItem
                  selected={isAdminActionsActive}
                  onClick={() => {
                    navigate({ to: "/admin-actions" });
                    handleMenuClose();
                  }}
                  sx={{ minHeight: 36, gap: 1, px: 1.5 }}
                >
                  <ListItemIcon>
                    <AdminPanelSettingsOutlined fontSize="small" />
                  </ListItemIcon>
                  <Typography variant="body2" fontWeight={500}>
                    Admin Actions
                  </Typography>
                </MenuItem>
              ) : null}
              <Divider
                sx={{
                  mt: "0 !important",
                  mb: "0 !important",
                }}
              />
              <MenuItem
                onClick={() => {
                  if (isImpersonating) {
                    void stopImpersonating();
                  } else {
                    void fullSignOut();
                  }
                  handleMenuClose();
                }}
                sx={{ minHeight: 36, gap: 1, px: 1.5 }}
              >
                <ListItemIcon>
                  {isImpersonating ? (
                    <SwapHoriz fontSize="small" />
                  ) : (
                    <Logout fontSize="small" />
                  )}
                </ListItemIcon>
                <Typography variant="body2" fontWeight={500}>
                  {isImpersonating ? "Stop Impersonating" : "Log out"}
                </Typography>
              </MenuItem>
            </Menu>
          </Box>
        ) : (
          <Button
            size="small"
            variant="text"
            onClick={() => navigate({ to: "/login", search: {} })}
            sx={{
              textTransform: "uppercase",
              fontFamily: "monospace",
              fontWeight: "bolder",
              color: "darkblue",
            }}
          >
            Login
          </Button>
        )}
      </Toolbar>
    </AppBar>
  );
};
