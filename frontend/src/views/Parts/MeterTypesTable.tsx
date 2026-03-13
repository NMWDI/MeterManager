import { useMemo } from "react";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import {
  Button,
  Card,
  CardContent,
  Grid,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Search, Add, SpeedOutlined } from "@mui/icons-material";
import { useNavigate } from "@tanstack/react-router";
import { useGetMeterTypeList } from "@/service";
import { Route } from "@/routes/manage/parts/index";
import {
  CustomCardHeader,
  GridFooterWithButton,
  IsTrueChip,
  ManageBreadcrumbTitle,
  TristateToggle,
} from "@/components";

export const MeterTypesTable = ({
  onSelectMeterType,
  onCreateMeterType,
}: {
  onSelectMeterType: (id: number) => void;
  onCreateMeterType: () => void;
}) => {
  const meterTypes = useGetMeterTypeList();
  const navigate = useNavigate();
  const search = Route.useSearch();

  const setSearch = (updater: (prev: typeof search) => any) => {
    navigate({
      to: "/manage/parts",
      search: (prev) => updater(prev as any),
      replace: true,
    });
  };

  const cols: GridColDef[] = [
    { field: "brand", headerName: "Brand", width: 200 },
    {
      field: "series",
      headerName: "Series",
      width: 100,
    },
    { field: "model", headerName: "Model Number", width: 200 },
    { field: "size", headerName: "Size", width: 100 },
    { field: "description", headerName: "Description", width: 200 },
    {
      field: "in_use",
      headerName: "In Use",
      renderCell: (params: any) => <IsTrueChip assert={params.value == true} />,
    },
  ];

  const filteredRows = useMemo(() => {
    const q = (search.meter_type_q ?? "").toLowerCase();
    let rows = (meterTypes.data ?? []).filter(
      (row) =>
        row.brand?.toLowerCase().includes(q) ||
        row.model?.toLowerCase().includes(q) ||
        row.size?.toString().includes(q) ||
        row.series?.toLowerCase().includes(q) ||
        row.description?.toLowerCase().includes(q),
    );

    if (search.meter_type_in_use !== "all") {
      const wantInUse = search.meter_type_in_use === "true";
      rows = rows.filter((row) => row.in_use === wantInUse);
    }

    return rows;
  }, [meterTypes.data, search.meter_type_q, search.meter_type_in_use]);

  return (
    <Card>
      <CustomCardHeader title="Meter Types" icon={SpeedOutlined} />
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
              placeholder="Search Meter Types..."
              variant="outlined"
              size="small"
              value={search.meter_type_q ?? ""}
              onChange={(event: any) =>
                setSearch((prev) => ({
                  ...prev,
                  meter_type_q: event.target.value,
                  mt_page: 0,
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
              label="In Use"
              value={search.meter_type_in_use}
              onToggle={(next) =>
                setSearch((prev) => ({
                  ...prev,
                  meter_type_in_use: next,
                  mt_page: 0,
                }))
              }
            />
          </Grid>
        </Grid>
        <Grid item xs={12}>
          <DataGrid
            sx={{ height: 550, border: "none" }}
            rows={filteredRows ?? []}
            pagination
            paginationModel={{
              page: search.mt_page,
              pageSize: search.mt_pageSize,
            }}
            onPaginationModelChange={(model) =>
              setSearch((prev) => ({
                ...prev,
                mt_pageSize: model.pageSize,
                mt_page: model.pageSize !== prev.mt_pageSize ? 0 : model.page,
              }))
            }
            pageSizeOptions={[10, 25, 50, 100]}
            rowSelectionModel={
              search.meter_type_id ? [search.meter_type_id] : []
            }
            loading={meterTypes.isLoading}
            columns={cols}
            disableColumnMenu
            onRowClick={(selectedRow) => {
              onSelectMeterType(selectedRow.row.id);
            }}
            slots={{ footer: GridFooterWithButton }}
            slotProps={{
              footer: {
                button: (
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
                      onClick={onCreateMeterType}
                      sx={{ flexShrink: 0, width: { xs: "100%", sm: "auto" } }}
                    >
                      <Add fontSize="small" sx={{ mr: 0.5 }} />
                      Create
                    </Button>
                  </Stack>
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
