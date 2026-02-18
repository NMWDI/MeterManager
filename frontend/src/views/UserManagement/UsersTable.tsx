import { useEffect, useState } from "react";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import {
  Button,
  Card,
  CardContent,
  Grid,
  InputAdornment,
  TextField,
  Typography,
} from "@mui/material";
import { Search, Add, FormatListBulletedOutlined } from "@mui/icons-material";
import { useGetUserAdminList } from "@/service";
import { User } from "@/interfaces";
import {
  CustomCardHeader,
  GridFooterWithButton,
  IsTrueChip,
  RoleChip,
  TristateToggle,
} from "@/components";

export const UsersTable = ({
  setSelectedUser,
  setUserAddMode,
}: {
  setSelectedUser: Function;
  setUserAddMode: Function;
}) => {
  const usersList = useGetUserAdminList();
  const [userSearchQuery, setUserSearchQuery] = useState<string>("");
  const [filteredRows, setFilteredRows] = useState<User[]>();
  const [isActiveFilter, setIsActiveFilter] = useState<boolean>();
  const [isTechnicianFilter, setIsTechnicianFilter] = useState<boolean>();

  const cols: GridColDef[] = [
    { field: "full_name", headerName: "Full Name", width: 200 },
    {
      field: "user_role",
      headerName: "Role",
      width: 125,
      valueGetter: (_, row) => row.user_role.name,
      renderCell: (params: any) => <RoleChip role={params.value} />,
    },
    { field: "email", headerName: "Email", width: 250 },
    { field: "username", headerName: "Username", width: 150 },
    {
      field: "disabled",
      headerName: "Active",
      width: 80,
      renderCell: (params: any) => <IsTrueChip assert={params.value != true} />,
    },
    { field: "display_name", headerName: "Display Name", width: 150 },
    { field: "redirect_page", headerName: "Redirect Page", width: 200 },
  ];

  useEffect(() => {
    const psq = userSearchQuery.toLowerCase();
    let filtered = (usersList.data ?? []).filter(
      (row) =>
        row.full_name.toLowerCase().includes(psq) ||
        row.email?.toLowerCase().includes(psq) ||
        row.username?.toLowerCase().includes(psq),
    );
    if (isActiveFilter != undefined)
      filtered = filtered.filter((row) => !row.disabled == isActiveFilter);
    if (isTechnicianFilter != undefined)
      filtered = filtered.filter(
        (row) => (row?.user_role?.name == "Technician") == isTechnicianFilter,
      );

    setFilteredRows(filtered);
  }, [userSearchQuery, usersList.data, isActiveFilter, isTechnicianFilter]);

  return (
    <Card>
      <CustomCardHeader title="All Users" icon={FormatListBulletedOutlined} />
      <CardContent>
        <Grid container spacing={2}>
          <Grid
            item
            xs={12}
            md={6}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-start",
            }}
          >
            <TextField
              sx={{ m: 0, width: "100%", maxWidth: "75rem" }}
              placeholder="Search Users..."
              variant="outlined"
              size="small"
              value={userSearchQuery}
              onChange={(event: any) => setUserSearchQuery(event.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid
            item
            xs={12}
            md={6}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
            }}
          >
            <Typography variant="body1" style={{ display: "inline" }}>
              Choose Filters:{" "}
            </Typography>
            <TristateToggle
              label="Active"
              onToggle={(state: boolean | undefined) =>
                setIsActiveFilter(state)
              }
            />
            <TristateToggle
              label="Technician User"
              onToggle={(state: boolean | undefined) =>
                setIsTechnicianFilter(state)
              }
            />
          </Grid>
        </Grid>
        <Grid item xs={12}>
          <DataGrid
            sx={{ height: 550, border: "none" }}
            rows={filteredRows ?? []}
            loading={usersList.isLoading}
            columns={cols}
            disableColumnMenu
            onRowClick={(selectedRow) => {
              setSelectedUser(
                usersList.data?.find(
                  (user: User) => user.id == selectedRow.row.id,
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
                    onClick={() => setUserAddMode(true)}
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
      </CardContent>
    </Card>
  );
};
