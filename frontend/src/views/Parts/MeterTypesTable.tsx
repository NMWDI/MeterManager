import { useEffect, useState } from "react";
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
import { Search, Add, FormatListBulletedOutlined } from "@mui/icons-material";
import { useGetMeterTypeList } from "@/service";
import { MeterTypeLU } from "@/interfaces";
import {
  CustomCardHeader,
  GridFooterWithButton,
  IsTrueChip,
  TristateToggle,
} from "@/components";

export const MeterTypesTable = ({
  setSelectedMeterType,
  setMeterTypeAddMode,
}: {
  setSelectedMeterType: Function;
  setMeterTypeAddMode: Function;
}) => {
  const meterTypes = useGetMeterTypeList();
  const [meterTypeSearchQuery, setMeterTypeSearchQuery] = useState<string>("");
  const [filteredRows, setFilteredRows] = useState<MeterTypeLU[]>();
  const [inUseFilter, setInUseFilter] = useState<boolean>();

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

  // Filter rows based on search. Cant use multiple filters w/o pro datagrid
  useEffect(() => {
    const psq = meterTypeSearchQuery.toLowerCase();
    let filtered = (meterTypes.data ?? []).filter(
      (row) =>
        row.brand?.toLowerCase().includes(psq) ||
        row.model?.toLowerCase().includes(psq) ||
        row.size?.toString().includes(psq) ||
        row.series?.toLowerCase().includes(psq) ||
        row.description?.toLowerCase().includes(psq),
    );
    if (inUseFilter != undefined)
      filtered = filtered.filter((row) => row.in_use == inUseFilter);

    setFilteredRows(filtered);
  }, [meterTypeSearchQuery, meterTypes.data, inUseFilter]);

  return (
    <Card>
      <CustomCardHeader
        title="All Meter Types"
        icon={FormatListBulletedOutlined}
      />
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
              value={meterTypeSearchQuery}
              onChange={(event: any) =>
                setMeterTypeSearchQuery(event.target.value)
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
              onToggle={(state: boolean | undefined) => setInUseFilter(state)}
            />
          </Grid>
        </Grid>
        <Grid item xs={12}>
          <DataGrid
            sx={{ height: 550, border: "none" }}
            rows={filteredRows ?? []}
            loading={meterTypes.isLoading}
            columns={cols}
            disableColumnMenu
            onRowClick={(selectedRow) => {
              setSelectedMeterType(selectedRow.row);
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
                      onClick={() => setMeterTypeAddMode(true)}
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
