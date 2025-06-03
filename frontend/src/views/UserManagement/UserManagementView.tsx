import { Grid } from "@mui/material";
import { useEffect, useState } from "react";
import { UsersTable } from "./UsersTable";
import { UserDetailsCard } from "./UserDetailsCard";
import { User, UserRole } from "../../interfaces";
import { RolesTable } from "./RolesTable";
import { RoleDetailsCard } from "./RoleDetailsCard";
import { PermissionsTable } from "./PermissionsTable";
import { BackgroundBox } from "../../components/BackgroundBox";

export const UserManagementView = () => {
  const [selectedUser, setSelectedUser] = useState<User>();
  const [userAddMode, setUserAddMode] = useState<boolean>(true);
  const [selectedRole, setSelectedRole] = useState<UserRole>();
  const [roleAddMode, setRoleAddMode] = useState<boolean>(true);

  // Exit add mode when table row is selected
  useEffect(() => {
    if (selectedUser) setUserAddMode(false);
  }, [selectedUser]);

  useEffect(() => {
    if (selectedRole) setRoleAddMode(false);
  }, [selectedRole]);

  return (
    <BackgroundBox>
      <Grid container spacing={2}>
        <Grid
          container
          item
          spacing={2}
          sx={{ minHeight: { xs: "100vh", lg: "70vh" } }}
        >
          <Grid item xs={8}>
            <UsersTable
              setSelectedUser={setSelectedUser}
              setUserAddMode={setUserAddMode}
            />
          </Grid>
          <Grid item xs={4}>
            <UserDetailsCard
              selectedUser={selectedUser}
              userAddMode={userAddMode}
            />
          </Grid>
        </Grid>
        <Grid
          container
          item
          spacing={2}
          sx={{ minHeight: { xs: "100vh", lg: "70vh" } }}
        >
          <Grid item xs={8}>
            <RolesTable
              setSelectedRole={setSelectedRole}
              setRoleAddMode={setRoleAddMode}
            />
          </Grid>
          <Grid item xs={4}>
            <RoleDetailsCard
              selectedRole={selectedRole}
              roleAddMode={roleAddMode}
            />
          </Grid>
        </Grid>
        <Grid
          id="permissions_section"
          container
          item
          spacing={2}
          sx={{ minHeight: { xs: "100vh", lg: "70vh" } }}
        >
          <Grid item xs={8}>
            <PermissionsTable />
          </Grid>
        </Grid>
      </Grid>
    </BackgroundBox>
  );
};
