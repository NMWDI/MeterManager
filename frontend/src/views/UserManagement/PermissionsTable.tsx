import { useEffect, useState } from "react";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import {
  Button,
  Card,
  CardContent,
  Grid,
  InputAdornment,
  TextField,
  Tooltip,
} from "@mui/material";
import { Search, Add, FormatListBulletedOutlined } from "@mui/icons-material";
import { useGetSecurityScopes } from "@/service";
import { SecurityScope } from "@/interfaces";
import { CustomCardHeader, GridFooterWithButton } from "@/components";

export const PermissionsTable = () => {
  const securityScopesList = useGetSecurityScopes();
  const [permissionSearchQuery, setPermissionSearchQuery] =
    useState<string>("");
  const [filteredRows, setFilteredRows] = useState<SecurityScope[]>();

  const cols: GridColDef[] = [
    { field: "scope_string", headerName: "Permission Name", width: 200 },
    { field: "description", headerName: "Desciption", width: 600 },
  ];

  // Filter rows based on search. Cant use multiple filters w/o pro datagrid
  useEffect(() => {
    const psq = permissionSearchQuery.toLowerCase();
    let filtered = (securityScopesList.data ?? []).filter(
      (row) =>
        row.scope_string.toLowerCase().includes(psq) ||
        row.description.toLowerCase().includes(psq),
    );

    setFilteredRows(filtered);
  }, [permissionSearchQuery, securityScopesList.data]);

  return (
    <Card>
      <CustomCardHeader
        title="All Permissions"
        icon={FormatListBulletedOutlined}
      />
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
              placeholder="Search Permissions..."
              variant="outlined"
              size="small"
              onChange={(event: any) =>
                setPermissionSearchQuery(event.target.value)
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
              loading={securityScopesList.isLoading}
              columns={cols}
              disableColumnMenu
              slots={{ footer: GridFooterWithButton }}
              slotProps={{
                footer: {
                  button: (
                    <Tooltip title="Permissions must be created by a developer">
                      <span>
                        <Button
                          disabled
                          variant="contained"
                          size="small"
                          sx={{
                            flexShrink: 0,
                            width: { xs: "100%", sm: "auto" },
                          }}
                        >
                          <Add fontSize="small" sx={{ mr: 0.5 }} />
                          Create
                        </Button>
                      </span>
                    </Tooltip>
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
