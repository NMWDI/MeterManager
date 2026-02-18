import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  TextField,
  Tooltip,
  IconButton,
} from "@mui/material";
import { ArrowBack, History } from "@mui/icons-material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import dayjs from "dayjs";
import { CustomCardHeader, BackgroundBox, EventTypeChip } from "@/components";
import { useGetPartHistory } from "@/service";

export const PartsHistory = () => {
  const { id } = useParams<{ id: string }>();
  const history = useGetPartHistory(id);
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    const raw = history.data?.history ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return raw;

    return raw.filter((r) => {
      return (
        r.event_type.toLowerCase().includes(q) ||
        (r.note ?? "").toLowerCase().includes(q)
      );
    });
  }, [history.data, search]);

  const cols: GridColDef[] = [
    {
      field: "event_date",
      headerName: "Date",
      width: 200,
      renderCell: (params) => {
        const row = params.row;
        if (row.event_type === "initial") return "Initial";
        const d = new Date(params.value);
        return isNaN(d.getTime())
          ? String(params.value)
          : dayjs(d).format("MMM D, YYYY h:mm A");
      },
      sortComparator: (a, b) => {
        // keep Initial at top
        if (a === "Initial") return -1;
        if (b === "Initial") return 1;
        return new Date(a).getTime() - new Date(b).getTime();
      },
    },
    {
      field: "event_type",
      headerName: "Type",
      width: 140,
      renderCell: (params) => (
        <EventTypeChip event_type={params.value as string} />
      ),
    },
    {
      field: "delta",
      headerName: "Change",
      width: 140,
      renderCell: (params) => {
        const n = Number(params.value ?? 0);
        const label = `${n > 0 ? "+" : ""}${n}`;
        return (
          <Box
            sx={{
              width: "100%",
              height: "100%",
              display: "flex",
              justifyContent: "start",
              alignItems: "center",
            }}
          >
            <Typography sx={{ fontWeight: 700 }}>{label}</Typography>
          </Box>
        );
      },
    },
    {
      field: "total_after",
      headerName: "Total After",
      width: 160,
      renderCell: (params) => (
        <Box
          sx={{
            width: "100%",
            height: "100%",
            display: "flex",
            justifyContent: "start",
            alignItems: "center",
          }}
        >
          <Typography sx={{ fontWeight: 700 }}>{params.value}</Typography>
        </Box>
      ),
    },
    {
      field: "work_order_id",
      headerName: "Work Order",
      width: 140,
      renderCell: (params) =>
        params.value ? (
          <Link
            to={{
              pathname: "/workorders",
              search: `?work_order_id=${params.value}`,
            }}
          >
            WO {params.value}
          </Link>
        ) : (
          "N/A"
        ),
    },
    { field: "note", headerName: "Note", flex: 1, minWidth: 240 },
  ];

  return (
    <BackgroundBox>
      <Card sx={{ height: "fit-content" }}>
        <CustomCardHeader title="Parts Count History" icon={History} />
        <CardContent>
          <Grid container spacing={2} py={2}>
            <Grid item xs="auto">
              <Link to="/manage/parts">
                <Tooltip title="Go back" placement="right">
                  <IconButton aria-label="return to reports page">
                    <ArrowBack />
                  </IconButton>
                </Tooltip>
              </Link>
            </Grid>
            <Grid item xs={12} sm="auto">
              <TextField
                size="small"
                label="Search (type, note)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={{ width: { xs: "100%", md: 360 } }}
              />
            </Grid>
          </Grid>
          <Grid container spacing={2} px={2} py={2}>
            <Grid item xs={12}>
              <DataGrid
                sx={{ height: 600, border: "none" }}
                rows={rows}
                getRowId={(row) => row.row_id}
                loading={history.isLoading}
                columns={cols}
                disableRowSelectionOnClick
                disableColumnMenu
                disableColumnFilter
                hideFooterSelectedRowCount
                initialState={{
                  sorting: {
                    sortModel: [{ field: "event_date", sort: "asc" }],
                  },
                }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </BackgroundBox>
  );
};
