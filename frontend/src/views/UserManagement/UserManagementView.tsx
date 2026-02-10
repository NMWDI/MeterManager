import { Grid } from "@mui/material";
import { useEffect, useState } from "react";
import { User, UserRole } from "@/interfaces";
import { BackgroundBox } from "@/components";

import { UsersTable } from "./UsersTable";
import { UserDetailsCard } from "./UserDetailsCard";
import { RolesTable } from "./RolesTable";
import { RoleDetailsCard } from "./RoleDetailsCard";
import { PermissionsTable } from "./PermissionsTable";

export const UserManagementView = () => {
  const [selectedUser, setSelectedUser] = useState<User>();
  const [userAddMode, setUserAddMode] = useState<boolean>(true);
  const [selectedRole, setSelectedRole] = useState<UserRole>();
  const [roleAddMode, setRoleAddMode] = useState<boolean>(true);

  useEffect(() => {
    if (selectedUser) setUserAddMode(false);
  }, [selectedUser]);

  useEffect(() => {
    if (selectedRole) setRoleAddMode(false);
  }, [selectedRole]);

  return (
    <BackgroundBox>
      <Grid container spacing={2}>
        <Grid item xs={12} lg={8}>
          <UsersTable
            setSelectedUser={setSelectedUser}
            setUserAddMode={setUserAddMode}
          />
        </Grid>
        <Grid item xs={12} lg={4}>
          <UserDetailsCard
            selectedUser={selectedUser}
            userAddMode={userAddMode}
          />
        </Grid>
        <Grid item xs={12} lg={8}>
          <RolesTable
            setSelectedRole={setSelectedRole}
            setRoleAddMode={setRoleAddMode}
          />
        </Grid>
        <Grid item xs={12} lg={4}>
          <RoleDetailsCard
            selectedRole={selectedRole}
            roleAddMode={roleAddMode}
          />
        </Grid>
        <Grid item xs={12} lg={8}>
          <PermissionsTable />
        </Grid>
      </Grid>
    </BackgroundBox>
  );
};
