import { useState } from "react";
import { Box } from "@mui/material";
import { Topbar } from "@/components";
import Sidenav from "./sidenav";

const drawerWidth = 250;

export const AppLayout = ({ children }: { children: JSX.Element }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <Box sx={{ display: "flex", flexGrow: 1, overflow: "hidden" }}>
      <Topbar
        open={drawerOpen}
        onMenuClick={() => setDrawerOpen(!drawerOpen)}
      />
      <Sidenav
        open={drawerOpen}
        drawerWidth={drawerWidth}
        onClose={() => setDrawerOpen(false)}
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          flexShrink: 1,
          minWidth: 0,
          p: 3,
          mt: 8,
        }}
      >
        {children}
      </Box>
    </Box>
  );
};
