import { Box, Button, Stack } from "@mui/material";
import { Link } from "react-router-dom";
import { DataGrid, GridColDef, GridSortModel } from "@mui/x-data-grid";
import React, { useEffect, useState } from "react";
import { useDebounce } from "use-debounce";
import { SecurityScope } from "../../interfaces";
import { useGetWells } from "../../service/ApiServiceNew";
import { useAuthUser } from "react-auth-kit";
import { SortDirection, WellSortByField } from "../../enums";
import { Well, WellListQueryParams } from "../../interfaces";
import GridFooterWithButton from "../../components/GridFooterWithButton";
import AddIcon from "@mui/icons-material/Add";

//This is needed for typescript to recognize the slotProps... see https://v6.mui.com/x/react-data-grid/components/#custom-slot-props-with-typescript
declare module "@mui/x-data-grid" {
  interface FooterPropsOverrides {
    button: React.ReactNode;
  }
}

export default function WellSelectionTable({
  setSelectedWell,
  wellSearchQueryProp,
  setWellAddMode,
}: {
  setSelectedWell: Function;
  setWellAddMode: Function;
  wellSearchQueryProp: string;
}) {
  const [wellSearchQueryDebounced] = useDebounce(wellSearchQueryProp, 250);
  const [wellListQueryParams, setWellListQueryParams] =
    useState<WellListQueryParams>();
  const [gridSortModel, setGridSortModel] = useState<GridSortModel>();
  const [paginationModel, setPaginationModel] = useState({
    pageSize: 25,
    page: 0,
  });
  const [gridRowCount, setGridRowCount] = useState<number>(100);

  const wellsList = useGetWells(wellListQueryParams);

  const authUser = useAuthUser();
  const hasAdminScope = authUser()
    ?.user_role.security_scopes.map(
      (scope: SecurityScope) => scope.scope_string,
    )
    .includes("admin");

  const cols: GridColDef[] = [
    {
      field: "ra_number",
      headerName: "RA Number",
      flex: 1,
      minWidth: 100,
    },
    {
      field: "osetag",
      headerName: "OSE Tag",
      flex: 1,
      minWidth: 100,
    },
    {
      field: "water_users",
      headerName: "Water Users",
      flex: 1,
      minWidth: 150,
      sortable: false,
      valueGetter: (_, row: Well) =>
        row.meters.map((meter) => meter.water_users).join(", "),
    },
    {
      field: "use_type",
      headerName: "Use Type",
      flex: 1,
      minWidth: 150,
      valueGetter: (_, row) => row.use_type?.use_type,
    },
    {
      field: "location",
      headerName: "TRSS",
      flex: 1,
      minWidth: 150,
      valueGetter: (_, row) => row.location?.trss,
    },
    {
      field: "meters",
      headerName: "Meters",
      flex: 2,
      minWidth: 200,
      sortable: false,
      renderCell: (params) => {
        const meters = params.value as Well["meters"];
        const links = meters.map((meter, index) => (
          <span key={meter.id}>
            <Link to={{ pathname: "/manage/meters", search: `?meter_id=${meter.id}` }}>
              {meter.serial_number}
            </Link>
            {index < params.value.length - 1 ? ", " : ""}
          </span>
        ));
        return <>{links}</>;
      },
    },
  ];
  // Filter rows based on query params
  useEffect(() => {
    const newParams = {
      search_string: wellSearchQueryDebounced,
      sort_by: gridSortModel?.at(0)?.field ?? WellSortByField.Name,
      sort_direction: gridSortModel
        ? gridSortModel[0]?.sort
        : SortDirection.Ascending,
      limit: paginationModel.pageSize,
      offset: paginationModel.page * paginationModel.pageSize,
    };
    setWellListQueryParams(newParams);
  }, [wellSearchQueryDebounced, gridSortModel, paginationModel]);

  useEffect(() => {
    setGridRowCount(wellsList.data?.total ?? 0); // Update the well count when new list is recieved from API
  }, [wellsList]);

  // On any query param change from the table, update meterListQueryParam
  // Ternaries in sorting make sure that the view defaults to showing the backend's defaults

  return (
    <Box sx={{ height: "550px" }}>
      <DataGrid
        sx={{ border: "none" }}
        rows={wellsList.data?.items ?? []}
        loading={wellsList.isPreviousData || wellsList.isLoading}
        columns={cols}
        sortingMode="server"
        paginationMode="server"
        disableColumnMenu
        keepNonExistentRowsSelected
        onRowClick={(selectedRow) => {
          setSelectedWell(
            wellsList.data?.items.find(
              (well: Well) => well.id == selectedRow.row.id,
            ),
          );
        }}
        onSortModelChange={setGridSortModel}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        rowCount={gridRowCount}
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
                  onClick={() => setWellAddMode(true)}
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
}
