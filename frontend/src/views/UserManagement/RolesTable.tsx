import { useMemo } from "react";
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
import { useNavigate } from "@tanstack/react-router";
import { useGetRoles } from "@/service";
import { Route } from "@/routes/manage/users";
import { CustomCardHeader, GridFooterWithButton } from "@/components";

export const RolesTable = ({
  onSelectRole,
  onCreateRole,
}: {
  onSelectRole: (id: number) => void;
  onCreateRole: () => void;
}) => {
  const rolesList = useGetRoles();
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
    const q = (search.role_q ?? "").toLowerCase();

    return (rolesList.data ?? []).filter((row) =>
      row.name.toLowerCase().includes(q),
    );
  }, [rolesList.data, search.role_q]);

  const cols: GridColDef[] = [
    { field: "name", headerName: "Role Name", flex: 1 },
    {
      field: "security_scopes",
      headerName: "Permissions",
      flex: 3,
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
              value={search.role_q ?? ""}
              onChange={(event: any) =>
                setSearch((prev) => ({
                  ...prev,
                  role_q: event.target.value,
                  r_page: 0,
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
          <Grid item xs={12}>
          <DataGrid
            sx={{ height: 550, border: "none" }}
            rows={filteredRows ?? []}
            pagination
            paginationModel={{
              page: search.r_page,
              pageSize: search.r_pageSize,
            }}
            onPaginationModelChange={(model) =>
              setSearch((prev) => ({
                ...prev,
                r_pageSize: model.pageSize,
                r_page: model.pageSize !== prev.r_pageSize ? 0 : model.page,
              }))
            }
            pageSizeOptions={[10, 25, 50, 100]}
            rowSelectionModel={search.role_id ? [search.role_id] : []}
            loading={rolesList.isLoading}
            columns={cols}
              disableColumnMenu
              onRowClick={(selectedRow) => onSelectRole(selectedRow.row.id)}
              slots={{ footer: GridFooterWithButton }}
              slotProps={{
                footer: {
                  button: (
                    <Button
                      variant="contained"
                      size="small"
                      onClick={onCreateRole}
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
