import { useEffect, useState, ReactNode, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { DataGrid, GridColDef, GridSortModel } from "@mui/x-data-grid";
import { useDebounce } from "use-debounce";
import { useAuthUser } from "@/utils/AuthKitCompat";
import { Box, Button, Stack } from "@mui/material";
import { Add } from "@mui/icons-material";
import { useNavigate } from "@tanstack/react-router";
import { Route } from "@/routes/manage/wells";
import { SecurityScope, Well, WellListQueryParams } from "@/interfaces";
import { useGetWells } from "@/service";
import { SortDirection, WellSortByField } from "@/enums";
import { GridFooterWithButton } from "@/components";

//This is needed for typescript to recognize the slotProps... see https://v6.mui.com/x/react-data-grid/components/#custom-slot-props-with-typescript
declare module "@mui/x-data-grid" {
  interface FooterPropsOverrides {
    button: ReactNode;
  }
}

export default function WellSelectionTable({
  wellSearchQueryProp,
}: {
  wellSearchQueryProp: string;
}) {
  const navigate = useNavigate();
  const search = Route.useSearch();

  const [wellSearchQueryDebounced] = useDebounce(wellSearchQueryProp, 250);
  const [gridSortModel, setGridSortModel] = useState<GridSortModel>();
  const [gridRowCount, setGridRowCount] = useState<number>(100);

  const queryParams = useMemo<WellListQueryParams>(
    () => ({
      search_string: wellSearchQueryDebounced || undefined,
      sort_by:
        (gridSortModel?.[0]?.field as WellSortByField) ?? WellSortByField.Name,
      sort_direction:
        (gridSortModel?.[0]?.sort as SortDirection) ?? SortDirection.Ascending,
      limit: search.pageSize,
      offset: search.page * search.pageSize,
    }),
    [wellSearchQueryDebounced, gridSortModel, search.page, search.pageSize],
  );

  const wellsList = useGetWells(queryParams);

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
          <span
            key={meter.id}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <Link
              to="/manage/meters"
              search={(prev) => ({
                meter_id: meter.id,
                activity_id: prev.activity_id ?? undefined,
                observation_id: prev.observation_id ?? undefined,
                add: prev.add ?? undefined,
                tab: prev.tab ?? undefined,
                q: prev.q ?? undefined,
                filters: prev.filters ?? undefined,
                m_sizeSort: prev.m_sizeSort ?? "all",
              })}
            >
              {meter.serial_number}
            </Link>
            {index < params.value.length - 1 ? ", " : ""}
          </span>
        ));
        return <>{links}</>;
      },
    },
  ];

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
        getRowId={(row) => row.id}
        rowSelectionModel={search.well_id ? [search.well_id] : []}
        loading={wellsList.isPreviousData || wellsList.isLoading}
        columns={cols}
        sortingMode="server"
        disableColumnMenu
        keepNonExistentRowsSelected
        onRowClick={(selectedRow) => {
          if (search.well_id === selectedRow.row.id) {
            navigate({
              to: "/manage/wells",
              search: (prev) => ({
                ...(prev as any),
                add: true,
                well_id: undefined,
              }),
              replace: true,
            });
            return;
          }

          const well = wellsList.data?.items.find(
            (well: Well) => well.id == selectedRow.row.id,
          );

          navigate({
            to: "/manage/wells",
            search: (prev) => ({
              ...(prev as any),
              well_id: well?.id,
              add: false,
            }),
            replace: true,
          });
        }}
        onSortModelChange={setGridSortModel}
        pagination
        paginationMode="server"
        paginationModel={{ page: search.page, pageSize: search.pageSize }}
        pageSizeOptions={[10, 25, 50, 100]}
        onPaginationModelChange={(m) => {
          navigate({
            to: "/manage/wells",
            search: (prev) => ({
              ...(prev as any),
              pageSize: m.pageSize,
              page: m.pageSize !== (prev as any).pageSize ? 0 : m.page,
            }),
            replace: true,
          });
        }}
        rowCount={gridRowCount}
        slots={{ footer: GridFooterWithButton }}
        slotProps={{
          footer: {
            button: hasAdminScope && (
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                sx={{
                  ml: { xs: 0, sm: 1 },
                  mt: { xs: 1, sm: 0 },
                  width: "100%",
                }}
                alignItems={{ xs: "stretch", sm: "center" }}
              >
                <Button
                  variant="contained"
                  size="small"
                  onClick={() =>
                    navigate({
                      to: "/manage/wells",
                      search: (prev) => ({
                        ...(prev as any),
                        add: true,
                        well_id: undefined,
                      }),
                      replace: true,
                    })
                  }
                  sx={{ flexShrink: 0, width: { xs: "100%", sm: "auto" } }}
                >
                  <Add fontSize="small" sx={{ mr: 0.5 }} />
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
