import { useEffect, useState } from "react";
import { Box, useMediaQuery, useTheme } from "@mui/material";
import { Topbar } from "@/components";
import { SessionStatusPoller } from "@/components/SessionStatusPoller";
import { DESKTOP_COLLAPSED_WIDTH, SidebarInset } from "@/components/ui/sidebar";
import Sidenav from "./sidenav";
import { useAuthUser } from "react-auth-kit";

const defaultSidebarWidth = 280;
const sidebarOpenStorageKey = "wmdb.sidebar.open";
const sidebarWidthStorageKey = "wmdb.sidebar.width";

const readStoredSidebarOpen = () => {
  if (typeof window === "undefined") return true;

  const raw = window.localStorage.getItem(sidebarOpenStorageKey);
  if (raw === null) return true;
  return raw === "true";
};

const readStoredSidebarWidth = () => {
  if (typeof window === "undefined") return defaultSidebarWidth;

  const raw = window.localStorage.getItem(sidebarWidthStorageKey);
  const parsed = raw ? Number(raw) : NaN;

  if (!Number.isFinite(parsed) || parsed <= DESKTOP_COLLAPSED_WIDTH) {
    return defaultSidebarWidth;
  }

  return parsed;
};

export const AppLayout = ({ children }: { children: JSX.Element }) => {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const [drawerOpen, setDrawerOpen] = useState(readStoredSidebarOpen);
  const [sidebarWidth, setSidebarWidth] = useState(readStoredSidebarWidth);
  const authUser = useAuthUser();
  const isLoggedIn = !!authUser();
  const shouldRenderSidebar = !isDesktop || isLoggedIn;
  const shouldShowDesktopSidebar = isDesktop && isLoggedIn;

  useEffect(() => {
    if (!isDesktop) {
      setDrawerOpen(false);
      return;
    }

    setDrawerOpen(readStoredSidebarOpen());
  }, [isDesktop]);

  useEffect(() => {
    if (!isDesktop || typeof window === "undefined") return;
    window.localStorage.setItem(sidebarOpenStorageKey, String(drawerOpen));
  }, [drawerOpen, isDesktop]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(sidebarWidthStorageKey, String(sidebarWidth));
  }, [sidebarWidth]);

  const effectiveSidebarWidth = shouldShowDesktopSidebar
    ? drawerOpen
      ? sidebarWidth
      : DESKTOP_COLLAPSED_WIDTH
    : 0;

  return (
    <Box
      sx={{
        display: "flex",
        flexGrow: 1,
        minHeight: "100vh",
        bgcolor: "#a5adb5",
      }}
    >
      {isLoggedIn ? <SessionStatusPoller /> : null}
      <Topbar
        open={drawerOpen}
        sidebarWidth={sidebarWidth}
        onMenuClick={() => setDrawerOpen((prev) => !prev)}
      />
      {shouldRenderSidebar ? (
        <Sidenav
          open={drawerOpen}
          drawerWidth={sidebarWidth}
          onClose={() => setDrawerOpen(false)}
          onOpen={() => setDrawerOpen(true)}
          onWidthChange={(width) => {
            setSidebarWidth(width);
            if (!drawerOpen) {
              setDrawerOpen(true);
            }
          }}
        />
      ) : null}

      <SidebarInset
        component="main"
        sx={{
          minHeight: "100vh",
          ml: shouldShowDesktopSidebar ? `${effectiveSidebarWidth}px` : 0,
          mt: "3.75rem",
          width: shouldShowDesktopSidebar
            ? `calc(100% - ${effectiveSidebarWidth}px)`
            : "100%",
          transition: "margin-left 180ms ease, width 180ms ease",
        }}
      >
        <Box
          sx={{
            minWidth: 0,
            p: { xs: 1, sm: 2 },
          }}
        >
          {children}
        </Box>
      </SidebarInset>
    </Box>
  );
};
