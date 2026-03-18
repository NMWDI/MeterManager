import { useMemo } from "react";
import { useAuthUser } from "react-auth-kit";
import DashboardCustomizeOutlinedIcon from "@mui/icons-material/DashboardCustomizeOutlined";
import { Box, Card, CardContent } from "@mui/material";
import { BackgroundBox, CustomCardHeader, NavLink } from "@/components";
import { navConfig } from "@/constants";
import { SecurityScope } from "@/interfaces";

export const ManageView = () => {
  const authUser = useAuthUser();
  const scopes = useMemo(
    () =>
      new Set(
        authUser()?.user_role?.security_scopes?.map(
          (scope: SecurityScope) => scope.scope_string,
        ) ?? [],
      ),
    [authUser],
  );

  const hasReadScope = scopes.has("read");
  const hasAdminScope = scopes.has("admin");

  const manageItems = navConfig.filter((item) => {
    if (!item.path.startsWith("/manage/")) return false;
    if (item.role === "Technician") return hasReadScope;
    if (item.role === "Admin") return hasAdminScope;
    return true;
  });

  return (
    <BackgroundBox>
      <Card sx={{ height: "fit-content" }}>
        <CustomCardHeader
          title="Manage"
          icon={DashboardCustomizeOutlinedIcon}
        />
        <CardContent>
          <Box sx={{ minWidth: "15rem", maxWidth: "15%" }} py={1}>
            {manageItems.map((item) => (
              <NavLink
                key={item.path}
                route={item.path}
                label={item.label}
                icon={item.icon}
              />
            ))}
          </Box>
        </CardContent>
      </Card>
    </BackgroundBox>
  );
};
