import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { Card, CardContent, Grid } from "@mui/material";
import { VerifiedUserOutlined } from "@mui/icons-material";
import { useGetSecurityScopes } from "@/service";
import { CustomCardHeader } from "@/components";

export const PermissionsTable = () => {
  const securityScopesList = useGetSecurityScopes();

  const cols: GridColDef[] = [
    {
      field: "scope_string",
      headerName: "Permission Name",
      flex: 1,
    },
    { field: "description", headerName: "Desciption", flex: 3 },
  ];

  return (
    <Card>
      <CustomCardHeader title="Permissions" icon={VerifiedUserOutlined} />
      <CardContent>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <DataGrid
              sx={{ border: "none" }}
              rows={securityScopesList?.data ?? []}
              loading={securityScopesList.isLoading}
              columns={cols}
              disableColumnMenu
              disableColumnFilter
              disableRowSelectionOnClick
              hideFooter
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};
