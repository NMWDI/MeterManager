import { useEffect, useState } from "react";
import { Box, useMediaQuery, useTheme } from "@mui/material";
import { Topbar } from "@/components";
import {
  DESKTOP_COLLAPSED_WIDTH,
  SidebarInset,
  TOPBAR_HEIGHT,
} from "@/components/ui/sidebar";
import Sidenav from "./sidenav";

const defaultSidebarWidth = 280;

export const AppLayout = ({ children }: { children: JSX.Element }) => {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(defaultSidebarWidth);

  useEffect(() => {
    setDrawerOpen(isDesktop);
  }, [isDesktop]);

  const effectiveSidebarWidth = isDesktop
    ? drawerOpen
      ? sidebarWidth
      : DESKTOP_COLLAPSED_WIDTH
    : 0;

  return (
    <Box sx={{ display: "flex", flexGrow: 1, minHeight: "100vh", bgcolor: "#f8fafc" }}>
      <Topbar
        open={drawerOpen}
        sidebarWidth={sidebarWidth}
        onMenuClick={() => setDrawerOpen((prev) => !prev)}
      />
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
      <SidebarInset
        component="main"
        sx={{
          minHeight: "100vh",
          ml: isDesktop ? `${effectiveSidebarWidth}px` : 0,
          mt: TOPBAR_HEIGHT,
          width: isDesktop
            ? `calc(100% - ${effectiveSidebarWidth}px)`
            : "100%",
          transition: "margin-left 180ms ease, width 180ms ease",
        }}
      >
        <Box
          sx={{
            minWidth: 0,
            p: { xs: 2, sm: 3 },
          }}
        >
          {children}
        </Box>
      </SidebarInset>
    </Box>
  );
};
