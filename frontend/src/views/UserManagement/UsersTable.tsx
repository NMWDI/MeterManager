import { useEffect, useState } from "react";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import {
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  TextField,
} from "@mui/material";
import { useGetUserAdminList } from "../../service/ApiServiceNew";
import AddIcon from "@mui/icons-material/Add";
import FormatListBulletedOutlinedIcon from "@mui/icons-material/FormatListBulletedOutlined";
import SearchIcon from "@mui/icons-material/Search";
import { User } from "../../interfaces";
import TristateToggle from "../../components/TristateToggle";
import GridFooterWithButton from "../../components/GridFooterWithButton";
import { CustomCardHeader } from "../../components/CustomCardHeader";

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
    { field: "email", headerName: "Email", width: 250 },
    { field: "username", headerName: "Username", width: 150 },
    {
      field: "user_role",
      headerName: "Role",
      width: 200,
      valueGetter: (_, row) => row.user_role.name,
      renderCell: (params: any) => {
        switch (params.value) {
          case "Admin": {
            return <Chip size="small" label="Admin" color="primary" />;
          }
          case "Technician": {
            return <Chip size="small" label="Technician" color="secondary" />;
          }
          default: {
            return <Chip size="small" label={params.value} color="warning" />;
          }
        }
      },
    },
    {
      field: "disabled",
      headerName: "Active",
      renderCell: (params: any) =>
        params.value != true ? (
          <Chip variant="outlined" size="small" label="True" color="success" />
        ) : (
          <Chip variant="outlined" size="small" label="False" color="error" />
        ),
    },
  ];

  // Filter rows based on search. Cant use multiple filters w/o pro datagrid
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
    <Card sx={{ height: "100%" }}>
      <CustomCardHeader
        title="All Users"
        icon={FormatListBulletedOutlinedIcon}
      />
      <CardContent sx={{ height: "100%" }}>
        <Grid container>
          <Grid item xs={5}>
            <TextField
              label={
                <div style={{ display: "inline-flex", alignItems: "center" }}>
                  <SearchIcon sx={{ fontSize: "1.2rem" }} />{" "}
                  <span style={{ marginTop: 1 }}>&nbsp;Search Users</span>
                </div>
              }
              variant="outlined"
              size="small"
              value={userSearchQuery}
              onChange={(event: any) => setUserSearchQuery(event.target.value)}
              sx={{ marginBottom: "10px" }}
            />
          </Grid>
          <Grid item xs={7}>
            <div style={{ float: "right" }}>
              <h5 style={{ display: "inline" }}>Choose Filters: </h5>
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
            </div>
          </Grid>
        </Grid>
        <DataGrid
          sx={{ height: "500px", border: "none" }}
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
                  sx={{ mt: 1 }}
                  variant="contained"
                  onClick={() => setUserAddMode(true)}
                >
                  <AddIcon style={{ fontSize: "1rem" }} />
                  Add a New User
                </Button>
              ),
            },
          }}
          disableColumnFilter
        />
      </CardContent>
    </Card>
  );
};
