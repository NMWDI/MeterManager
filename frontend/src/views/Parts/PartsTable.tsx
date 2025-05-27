import { useEffect, useState } from "react";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import {
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  TextField,
} from "@mui/material";
import FormatListBulletedOutlinedIcon from "@mui/icons-material/FormatListBulletedOutlined";
import { useGetParts } from "../../service/ApiServiceNew";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
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
    <Card sx={{ height: "100%" }}>
      <CustomCardHeader
        title="All Parts"
        icon={FormatListBulletedOutlinedIcon}
      />
      <CardContent sx={{ height: "100%" }}>
        <Grid container>
          <Grid item xs={5}>
            <TextField
              label={
                <div style={{ display: "inline-flex", alignItems: "center" }}>
                  <SearchIcon sx={{ fontSize: "1.2rem" }} />{" "}
                  <span style={{ marginTop: 1 }}>&nbsp;Search Parts</span>
                </div>
              }
              variant="outlined"
              size="small"
              value={partSearchQuery}
              onChange={(event: any) => setPartSearchQuery(event.target.value)}
              sx={{ marginBottom: "10px" }}
            />
          </Grid>
          <Grid item xs={7}>
            <div style={{ float: "right" }}>
              <h5 style={{ display: "inline" }}>Choose Filters: </h5>
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
            </div>
          </Grid>
        </Grid>
        <DataGrid
          sx={{ height: "500px", border: "none" }}
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
                <Button
                  sx={{ mt: 2 }}
                  variant="contained"
                  onClick={() => setPartAddMode(true)}
                >
                  <AddIcon style={{ fontSize: "1rem" }} />
                  Add a New Part
                </Button>
              ),
            },
          }}
          disableColumnFilter
        />
      </CardContent>
    </Card>
  );
};
