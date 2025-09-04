import { useEffect, useState } from "react";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import {
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Search } from "@mui/icons-material";
import FormatListBulletedOutlinedIcon from "@mui/icons-material/FormatListBulletedOutlined";
import { useGetParts } from "../../service/ApiServiceNew";
import AddIcon from "@mui/icons-material/Add";
import { Part } from "../../interfaces";
import TristateToggle from "../../components/TristateToggle";
import GridFooterWithButton from "../../components/GridFooterWithButton";
import { CustomCardHeader } from "../../components/CustomCardHeader";

export const PartsTable = ({
  setSelectedPartID,
  setPartAddMode,
}: {
  setSelectedPartID: Function;
  setPartAddMode: Function;
}) => {
  const partsList = useGetParts();
  const [partSearchQuery, setPartSearchQuery] = useState<string>("");
  const [filteredRows, setFilteredRows] = useState<Part[]>();
  const [inUseFilter, setInUseFilter] = useState<boolean>();
  const [commonlyUsedFilter, setCommonlyUsedFilter] = useState<boolean>();

  const cols: GridColDef[] = [
    { field: "part_number", headerName: "Part Number", width: 150 },
    { field: "description", headerName: "Description", width: 250 },
    {
      field: "part_type",
      headerName: "Part Type",
      width: 200,
      valueGetter: (params: any) => params?.name,
    },
    { field: "count", headerName: "Count" },
    {
      field: "in_use",
      headerName: "In Use",
      renderCell: (params: any) =>
        params.value == true ? (
          <Chip variant="outlined" size="small" label="True" color="success" />
        ) : (
          <Chip variant="outlined" size="small" label="False" color="error" />
        ),
    },
    {
      field: "commonly_used",
      headerName: "Commonly Used",
      renderCell: (params: any) =>
        params.value == true ? (
          <Chip variant="outlined" size="small" label="True" color="success" />
        ) : (
          <Chip variant="outlined" size="small" label="False" color="error" />
        ),
    },
  ];

  // Filter rows based on search. Cant use multiple filters w/o pro datagrid
  useEffect(() => {
    const psq = partSearchQuery.toLowerCase();
    let filtered = (partsList.data ?? []).filter(
      (row) =>
        row.part_number.toLowerCase().includes(psq) ||
        row.description?.toLowerCase().includes(psq) ||
        row.part_type?.name.toLowerCase().includes(psq),
    );
    if (inUseFilter != undefined)
      filtered = filtered.filter((row) => row.in_use == inUseFilter);
    if (commonlyUsedFilter != undefined)
      filtered = filtered.filter(
        (row) => row.commonly_used == commonlyUsedFilter,
      );

    setFilteredRows(filtered);
  }, [partSearchQuery, partsList.data, inUseFilter, commonlyUsedFilter]);

  return (
    <Card>
      <CustomCardHeader
        title="All Parts"
        icon={FormatListBulletedOutlinedIcon}
      />
      <CardContent>
        <Grid container spacing={2}>
          <Grid item xs={6} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
            <TextField
              sx={{ m: 0, width: '100%', maxWidth: '75rem' }}
              placeholder="Search Parts..."
              variant="outlined"
              size="small"
              value={partSearchQuery}
              onChange={(event: any) => setPartSearchQuery(event.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={6} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
            <Typography variant="body1" style={{ display: "inline" }}>Choose Filters: </Typography>
            <TristateToggle
              label="In Use"
              onToggle={(state: boolean | undefined) => setInUseFilter(state)}
            />
            <TristateToggle
              label="Commonly Used"
              onToggle={(state: boolean | undefined) =>
                setCommonlyUsedFilter(state)
              }
            />
          </Grid>
          <Grid item xs={12}>
            <DataGrid
              sx={{ height: 550, border: "none" }}
              rows={filteredRows ?? []}
              loading={partsList.isLoading}
              columns={cols}
              disableColumnMenu
              onRowClick={(selectedRow) => {
                setSelectedPartID(selectedRow.row.id);
              }}
              slots={{ footer: GridFooterWithButton }}
              slotProps={{
                footer: {
                  button: (
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1}
                      sx={{ ml: { xs: 0, sm: 1 }, mt: { xs: 1, sm: 0 }, width: "100%" }}
                      alignItems={{ xs: "stretch", sm: "center" }}
                    >
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => setPartAddMode(true)}
                        sx={{ flexShrink: 0, width: { xs: "100%", sm: "auto" } }}
                      >
                        <AddIcon fontSize="small" sx={{ mr: 0.5 }} />
                        Create
                      </Button>
                    </Stack>
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
