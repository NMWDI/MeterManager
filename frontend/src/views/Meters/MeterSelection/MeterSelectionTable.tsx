import { useState, useEffect } from "react";
import { useDebounce } from "use-debounce";
import { Box, Button, Stack } from "@mui/material";
import { DataGrid, GridSortModel, GridColDef } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import { MeterListQueryParams, SecurityScope } from "../../../interfaces";
import {
  SortDirection,
  MeterSortByField,
  MeterStatusNames,
} from "../../../enums";
import { useGetMeterList } from "../../../service/ApiServiceNew";
import GridFooterWithButton from "../../../components/GridFooterWithButton";
import { useAuthUser } from "react-auth-kit";

interface MeterSelectionTableProps {
  onMeterSelection: Function;
  meterSearchQuery: string;
  meterStatusFilter: MeterStatusNames[];
  setMeterAddMode: Function;
}

export const MeterSelectionTable = ({
  onMeterSelection,
  meterSearchQuery,
  setMeterAddMode,
  meterStatusFilter,
}: MeterSelectionTableProps) => {
  const [meterSearchQueryDebounced] = useDebounce(meterSearchQuery, 250);
  const [meterListQueryParams, setMeterListQueryParams] =
    useState<MeterListQueryParams>({
      search_string: "",
      filter_by_status: [MeterStatusNames.Installed],
      sort_by: "serial_number",
      sort_direction: "asc",
      limit: 25,
      offset: 0,
    });
  const [gridSortModel, setGridSortModel] = useState<GridSortModel>();
  const [paginationModel, setPaginationModel] = useState({
    pageSize: 25,
    page: 0,
  });
  const [gridRowCount, setGridRowCount] = useState<number>(100);

  const authUser = useAuthUser();
  const hasAdminScope = authUser()
    ?.user_role.security_scopes.map(
      (scope: SecurityScope) => scope.scope_string,
    )
    .includes("admin");

  const meterList = useGetMeterList(meterListQueryParams);

  const meterTableColumns: GridColDef[] = [
    {
      field: "serial_number",
      headerName: "Serial Number",
      width: 150,
    },
    {
      field: "trss",
      headerName: "TRSS",
      width: 150,
      valueGetter: (_, row) => row.location?.trss,
    },
    {
      field: "water_users",
      headerName: "Water Users",
      valueGetter: (_, row) => row.water_users,
      width: 200,
    },
    {
      field: "ra_number",
      headerName: "RA Number",
      valueGetter: (_, row) => row.well?.ra_number,
      width: 200,
    },
  ];

  // On any query param change from the table, update meterListQueryParam
  // Ternaries in sorting make sure that the view defaults to showing the backend's defaults
  useEffect(() => {
    const newParams = {
      search_string: meterSearchQueryDebounced,
      filter_by_status: meterStatusFilter,
      sort_by: gridSortModel
        ? gridSortModel[0]?.field
        : MeterSortByField.SerialNumber,
      sort_direction: gridSortModel
        ? gridSortModel[0]?.sort
        : SortDirection.Ascending,
      limit: paginationModel.pageSize,
      offset: paginationModel.page * paginationModel.pageSize,
    };
    setMeterListQueryParams(newParams);
  }, [
    meterSearchQueryDebounced,
    gridSortModel,
    paginationModel,
    meterStatusFilter,
  ]);

  useEffect(() => {
    //If statement to prevent the gridRowCount from being set to 0 when the meterList is still loading which appears to reset pagination
    if (meterList.data) {
      setGridRowCount(meterList.data.total);
    }
  }, [meterList]);

  return (
    <Box sx={{ height: "550px" }}>
      <DataGrid
        sx={{ border: "none" }}
        rows={meterList.data?.items ?? []}
        loading={meterList.isPreviousData || meterList.isLoading}
        columns={meterTableColumns}
        sortingMode="server"
        onSortModelChange={setGridSortModel}
        onRowClick={(selectedRow) => onMeterSelection(selectedRow.row.id)}
        keepNonExistentRowsSelected
        paginationMode="server"
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        rowCount={gridRowCount}
        disableColumnMenu={true}
        slots={{ footer: GridFooterWithButton }}
        slotProps={{
          footer: {
            button: hasAdminScope && (
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                sx={{ ml: { xs: 0, sm: 1 }, mt: { xs: 1, sm: 0 }, width: "100%" }}
                alignItems={{ xs: "stretch", sm: "center" }}
              >
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => setMeterAddMode(true)}
                  sx={{ flexShrink: 0, width: { xs: "100%", sm: "auto" } }}
                >
                  <AddIcon fontSize="small" sx={{ mr: 0.5 }} />
                  Create
                </Button>
              </Stack>
            ),
          },
        }}
      />
    </Box>
  );
};
