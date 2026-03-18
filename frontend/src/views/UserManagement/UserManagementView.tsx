import { Grid } from "@mui/material";
import { BackgroundBox } from "@/components";
import { Route } from "@/routes/manage/users";
import { useNavigate } from "@tanstack/react-router";

import { UsersTable } from "@/views/UserManagement/UsersTable";
import { UserDetailsCard } from "@/views/UserManagement/UserDetailsCard";
import { RolesTable } from "@/views/UserManagement/RolesTable";
import { RoleDetailsCard } from "@/views/UserManagement/RoleDetailsCard";
import { PermissionsTable } from "@/views/UserManagement/PermissionsTable";

export const UserManagementView = () => {
  const navigate = useNavigate();
  const search = Route.useSearch();

  const setSearch = (updater: (prev: typeof search) => any) => {
    navigate({
      to: "/manage/users",
      search: (prev) => updater(prev as any),
      replace: true,
    });
  };

  return (
    <BackgroundBox>
      <Grid container spacing={2}>
        <Grid item xs={12} lg={8}>
          <UsersTable
            onSelectUser={(id: number) =>
              setSearch((prev) => ({
                ...prev,
                user_id: id,
                user_add: false,
              }))
            }
            onCreateUser={() =>
              setSearch((prev) => ({
                ...prev,
                user_id: undefined,
                user_add: true,
              }))
            }
          />
        </Grid>
        <Grid item xs={12} lg={4}>
          <UserDetailsCard
            userId={search.user_id}
            userAddMode={search.user_add}
          />
        </Grid>
        <Grid item xs={12} lg={8}>
          <RolesTable
            onSelectRole={(id: number) =>
              setSearch((prev) => ({ ...prev, role_id: id, role_add: false }))
            }
            onCreateRole={() =>
              setSearch((prev) => ({
                ...prev,
                role_id: undefined,
                role_add: true,
              }))
            }
          />
        </Grid>
        <Grid item xs={12} lg={4}>
          <RoleDetailsCard
            roleId={search.role_id}
            roleAddMode={search.role_add}
          />
        </Grid>
        <Grid item xs={12} lg={8}>
          <PermissionsTable />
        </Grid>
      </Grid>
    </BackgroundBox>
  );
};
