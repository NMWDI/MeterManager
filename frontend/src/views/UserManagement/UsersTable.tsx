import { useMemo } from "react";
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
import { useNavigate } from "@tanstack/react-router";
import { Route } from "@/routes/manage/users";
import { useGetUserAdminList } from "@/service";
import {
  CustomCardHeader,
  GridFooterWithButton,
  IsTrueChip,
  RoleChip,
  TristateToggle,
} from "@/components";

export const UsersTable = ({
  onSelectUser,
  onCreateUser,
}: {
  onSelectUser: (id: number) => void;
  onCreateUser: () => void;
}) => {
  const usersList = useGetUserAdminList();
  const navigate = useNavigate();
  const search = Route.useSearch();

  const setSearch = (updater: (prev: typeof search) => any) => {
    navigate({
      to: "/manage/users",
      search: (prev) => updater(prev as any),
      replace: true,
    });
  };

  const filteredRows = useMemo(() => {
    const q = (search.user_q ?? "").toLowerCase();

    let rows = (usersList.data ?? []).filter(
      (row) =>
        row.full_name.toLowerCase().includes(q) ||
        row.email?.toLowerCase().includes(q) ||
        row.username?.toLowerCase().includes(q),
    );

    if (search.active !== "all") {
      const wantActive = search.active === "true";
      rows = rows.filter((row) => !row.disabled === wantActive);
    }

    if (search.tech !== "all") {
      const wantTech = search.tech === "true";
      rows = rows.filter(
        (row) => (row.user_role?.name === "Technician") === wantTech,
      );
    }

    return rows;
  }, [usersList.data, search.user_q, search.active, search.tech]);

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
              value={search.user_q ?? ""}
              onChange={(e) =>
                setSearch((prev) => ({ ...prev, user_q: e.target.value }))
              }
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
              value={search.active}
              onToggle={(next) =>
                setSearch((prev) => ({
                  ...prev,
                  active: next,
                }))
              }
            />
            <TristateToggle
              label="Technician User"
              value={search.tech}
              onToggle={(next) =>
                setSearch((prev) => ({
                  ...prev,
                  tech: next,
                }))
              }
            />
          </Grid>
        </Grid>
        <Grid item xs={12}>
          <DataGrid
            sx={{ height: 550, border: "none" }}
            rows={filteredRows ?? []}
            rowSelectionModel={search.user_id ? [search.user_id] : []}
            loading={usersList.isLoading}
            columns={cols}
            disableColumnMenu
            onRowClick={(r) => onSelectUser(r.row.id)}
            slots={{ footer: GridFooterWithButton }}
            slotProps={{
              footer: {
                button: (
                  <Button
                    variant="contained"
                    size="small"
                    onClick={onCreateUser}
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
