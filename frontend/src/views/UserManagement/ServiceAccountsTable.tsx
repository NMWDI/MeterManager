import { useMemo } from "react";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  InputAdornment,
  TextField,
} from "@mui/material";
import { Add, ManageAccounts, Search } from "@mui/icons-material";
import { useNavigate } from "@tanstack/react-router";
import { Route } from "@/routes/manage/serviceaccounts";
import { useGetServiceAccounts } from "@/service";
import {
  CustomCardHeader,
  GridFooterWithButton,
  IsTrueChip,
  ManageBreadcrumbTitle,
  RoleChip,
  TristateToggle,
} from "@/components";

export const ServiceAccountsTable = ({
  onSelectServiceAccount,
  onCreateServiceAccount,
}: {
  onSelectServiceAccount: (id: number) => void;
  onCreateServiceAccount: () => void;
}) => {
  const serviceAccounts = useGetServiceAccounts();
  const navigate = useNavigate();
  const search = Route.useSearch();

  const setSearch = (updater: (prev: typeof search) => any) => {
    navigate({
      to: "/manage/serviceaccounts",
      search: (prev) => updater(prev as any),
      replace: true,
    });
  };

  const filteredRows = useMemo(() => {
    const q = (search.service_account_q ?? "").toLowerCase();
    let rows = (serviceAccounts.data ?? []).filter(
      (row) =>
        row.full_name.toLowerCase().includes(q) ||
        row.display_name?.toLowerCase().includes(q) ||
        row.username?.toLowerCase().includes(q),
    );

    if (search.service_account_active !== "all") {
      const wantActive = search.service_account_active === "true";
      rows = rows.filter((row) => !row.disabled === wantActive);
    }

    return rows;
  }, [
    serviceAccounts.data,
    search.service_account_active,
    search.service_account_q,
  ]);

  const cols: GridColDef[] = [
    { field: "full_name", headerName: "Name", width: 220 },
    { field: "username", headerName: "Identifier", width: 210 },
    {
      field: "user_role",
      headerName: "Role",
      width: 230,
      valueGetter: (_, row) => row.user_role?.name,
      renderCell: (params: any) => <RoleChip role={params.value} />,
    },
    {
      field: "disabled",
      headerName: "Active",
      width: 90,
      renderCell: (params: any) => <IsTrueChip assert={params.value != true} />,
    },
    {
      field: "api_keys",
      headerName: "Active Keys",
      width: 120,
      valueGetter: (_, row) =>
        row.api_keys?.filter((key: any) => !key.revoked_at).length ?? 0,
    },
    { field: "display_name", headerName: "Display Name", width: 180 },
  ];

  return (
    <Card>
      <CustomCardHeader
        title={<ManageBreadcrumbTitle current="Service Accounts" />}
        icon={ManageAccounts}
      />
      <CardContent>
        <Grid container spacing={2}>
          <Grid item xs={12} md={8}>
            <TextField
              sx={{ m: 0, width: "100%", maxWidth: "75rem" }}
              placeholder="Search Service Accounts..."
              variant="outlined"
              size="small"
              value={search.service_account_q ?? ""}
              onChange={(e) =>
                setSearch((prev) => ({
                  ...prev,
                  service_account_q: e.target.value,
                  sa_page: 0,
                }))
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
            md={4}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
            }}
          >
            <TristateToggle
              label="Active"
              value={search.service_account_active}
              onToggle={(next) =>
                setSearch((prev) => ({
                  ...prev,
                  service_account_active: next,
                  sa_page: 0,
                }))
              }
            />
          </Grid>
        </Grid>
        <Box sx={{ mt: 2 }}>
          <DataGrid
            sx={{ height: 360, border: "none" }}
            rows={filteredRows}
            pagination
            paginationModel={{
              page: search.sa_page,
              pageSize: search.sa_pageSize,
            }}
            onPaginationModelChange={(model) =>
              setSearch((prev) => ({
                ...prev,
                sa_pageSize: model.pageSize,
                sa_page:
                  model.pageSize !== prev.sa_pageSize ? 0 : model.page,
              }))
            }
            pageSizeOptions={[10, 25, 50]}
            rowSelectionModel={
              search.service_account_id ? [search.service_account_id] : []
            }
            loading={serviceAccounts.isLoading}
            columns={cols}
            disableColumnMenu
            disableColumnFilter
            onRowClick={(r) => {
              if (search.service_account_id === r.row.id) {
                onCreateServiceAccount();
                return;
              }

              onSelectServiceAccount(r.row.id);
            }}
            slots={{ footer: GridFooterWithButton }}
            slotProps={{
              footer: {
                button: (
                  <Button
                    variant="contained"
                    size="small"
                    onClick={onCreateServiceAccount}
                  >
                    <Add fontSize="small" sx={{ mr: 0.5 }} />
                    Create
                  </Button>
                ),
              },
            }}
          />
        </Box>
      </CardContent>
    </Card>
  );
};
