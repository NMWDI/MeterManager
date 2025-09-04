import { useAuthUser } from "react-auth-kit";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Box } from "@mui/material";
import { SecurityScope } from "./interfaces";
import Topbar from "./components/Topbar";
import Sidenav from "./sidenav";

const drawerWidth = 250;

export const AppLayout = ({
  pageComponent,
  requiredScopes = null,
  setErrorMessage = null,
}: any) => {
  const authUser = useAuthUser();
  const navigate = useNavigate();
  const location = useLocation();

  const isLoggedIn = authUser() != null;
  const userScopes: string[] =
    authUser()?.user_role?.security_scopes?.map(
      (scope: SecurityScope) => scope.scope_string
    ) ?? [];

  const hasScopes =
    requiredScopes == null
      ? true
      : requiredScopes?.every((scope: string) =>
        userScopes?.includes(scope)
      );

  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const currentPath = location.pathname;

    // Case 1: Not logged in
    if (!isLoggedIn) {
      const allowedRoutes = ["/", "/login"];
      if (!allowedRoutes.includes(currentPath)) {
        if (setErrorMessage)
          setErrorMessage("You must login to view pages.");
        navigate("/login", { replace: true });
      }
      return;
    }

    // Case 2: Logged in but no scopes at all
    if (userScopes.length === 0) {
      const allowedRoutes = ["/", "/login"];
      if (!allowedRoutes.includes(currentPath)) {
        if (setErrorMessage)
          setErrorMessage(
            "Your account does not have any permissions to view this page."
          );
        navigate("/", { replace: true });
      }
      return;
    }

    // Case 3: Logged in but missing required scopes
    if (!hasScopes) {
      if (setErrorMessage)
        setErrorMessage(
          "You do not have sufficient permissions to view this page."
        );
      navigate("/", { replace: true });
    }
  }, [isLoggedIn, hasScopes, userScopes, location.pathname]);

  return (
    <Box sx={{ display: "flex", flexGrow: 1, overflow: 'hidden' }}>
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
        {pageComponent}
      </Box>
    </Box >
  );
};

