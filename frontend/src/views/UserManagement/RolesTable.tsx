import { useEffect, useState } from "react";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import {
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  InputAdornment,
  TextField,
} from "@mui/material";
import { Search, Add, FormatListBulletedOutlined } from "@mui/icons-material";
import { useGetRoles } from "@/service/ApiServiceNew";
import { UserRole } from "@/interfaces";
import { CustomCardHeader, GridFooterWithButton } from "@/components";

export const RolesTable = ({
  setSelectedRole,
  setRoleAddMode,
}: {
  setSelectedRole: Function;
  setRoleAddMode: Function;
}) => {
  const rolesList = useGetRoles();
  const [roleSearchQuery, setRoleSearchQuery] = useState<string>("");
  const [filteredRows, setFilteredRows] = useState<UserRole[]>();

  const cols: GridColDef[] = [
    { field: "name", headerName: "Role Name", width: 200 },
    {
      field: "security_scopes",
      headerName: "Permissions",
      width: 600,
      renderCell: (params: any) => {
        const maxChips = 5;
        const additional = params?.value.length - maxChips;
        if (params.value?.length > maxChips) {
          const chips = params.value
            ?.slice(0, maxChips)
            .map((scope: any) => (
              <Chip size="small" label={scope.scope_string} sx={{ mr: 1 }} />
            ));
          return [
            ...chips,
            <Chip size="small" label={`+(${additional} more)`} />,
          ];
        }
        return params.value?.map((scope: any) => (
          <Chip size="small" label={scope.scope_string} sx={{ mr: 1 }} />
        ));
      },
    },
  ];

  // Filter rows based on search. Cant use multiple filters w/o pro datagrid
  useEffect(() => {
    const psq = roleSearchQuery.toLowerCase();
    let filtered = (rolesList.data ?? []).filter((row) =>
      row.name.toLowerCase().includes(psq),
    );

    setFilteredRows(filtered);
  }, [roleSearchQuery, rolesList.data]);

  return (
    <Card>
      <CustomCardHeader title="All Roles" icon={FormatListBulletedOutlined} />
      <CardContent>
        <Grid container spacing={2}>
          <Grid
            item
            xs={6}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-start",
            }}
          >
            <TextField
              sx={{ m: 0, width: "100%", maxWidth: "75rem" }}
              placeholder="Search Roles..."
              variant="outlined"
              size="small"
              value={roleSearchQuery}
              onChange={(event: any) => setRoleSearchQuery(event.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12}>
            <DataGrid
              sx={{ height: 550, border: "none" }}
              rows={filteredRows ?? []}
              loading={rolesList.isLoading}
              columns={cols}
              disableColumnMenu
              onRowClick={(selectedRow) => {
                setSelectedRole(
                  rolesList.data?.find(
                    (role: UserRole) => role.id == selectedRow.row.id,
                  ),
                );
              }}
              slots={{ footer: GridFooterWithButton }}
              slotProps={{
                footer: {
                  button: (
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => setRoleAddMode(true)}
                      sx={{ flexShrink: 0, width: { xs: "100%", sm: "auto" } }}
                    >
                      <Add fontSize="small" sx={{ mr: 0.5 }} />
                      Create
                    </Button>
                  ),
                },
              }}
              disableColumnFilter
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};
