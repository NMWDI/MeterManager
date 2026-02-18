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
  Button,
  InputAdornment,
} from "@mui/material";
import { ArrowBack, History, Search } from "@mui/icons-material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import dayjs, { Dayjs } from "dayjs";
import {
  CustomCardHeader,
  BackgroundBox,
  EventTypeChip,
  ControlledDatepicker,
  ControlledSelectNonObject,
} from "@/components";
import { useGetPartHistory } from "@/service";
import { useForm } from "react-hook-form";

type EventType = "initial" | "used" | "added" | "current";

type PartsHistoryFormValues = {
  from?: Dayjs | null;
  to: Dayjs;
  event_types: EventType[];
};

const schema = yup.object().shape({
  from: yup.mixed<Dayjs>().nullable(),
  to: yup
    .mixed<Dayjs>()
    .nullable()
    .required("To date is required")
    .test("is-after", "'To' date must be after 'From'", function (value) {
      const { from } = this.parent;
      return !from || !value || dayjs(value).isAfter(dayjs(from));
    }),
  event_types: yup
    .array()
    .of(yup.string().oneOf(["initial", "used", "added", "current"]).required())
    .min(1, "Select at least one event type")
    .required(),
});

const defaultSchema = {
  from: null,
  to: dayjs().endOf("month"),
  event_types: ["initial", "used", "added", "current"] as (
    | "initial"
    | "used"
    | "added"
    | "current"
  )[],
};

export const PartsHistory = () => {
  const { id } = useParams<{ id: string }>();
  const history = useGetPartHistory(id);
  const [search, setSearch] = useState("");

  const { control, watch, reset } = useForm<PartsHistoryFormValues>({
    resolver: yupResolver(schema),
    defaultValues: defaultSchema,
  });

  const from = watch("from");
  const to = watch("to");
  const eventTypes = watch("event_types");

  const rows = useMemo(() => {
    const raw = history.data?.history ?? [];
    const q = search.trim().toLowerCase();

    const fromDate = from ? dayjs(from).startOf("day") : null;
    const toDate = to ? dayjs(to).endOf("day") : null;

    const selectedTypes = new Set((eventTypes ?? []) as string[]);

    const currentRow =
      history.data?.current_count != null
        ? {
            row_id: `current-${id ?? "unknown"}`,
            part_id: Number(id),
            event_date: dayjs().toISOString(), // "today"
            event_type: "current" as const,
            ref_id: null,
            note: "Current count",
            delta: 0,
            total_after: history.data.current_count,
            work_order_id: null,
          }
        : null;

    const withCurrent = currentRow ? [...raw, currentRow] : raw;

    return withCurrent.filter((r: any) => {
      // event type filter
      if (selectedTypes.size && !selectedTypes.has(r.event_type)) return false;

      // note search filter
      if (q && !(r.note ?? "").toLowerCase().includes(q)) return false;

      // date range filter
      if (r.event_type === "initial") return selectedTypes.has("initial"); // keep initial independent of date
      if (r.event_type === "current") return selectedTypes.has("current");

      const d = dayjs(r.event_date);
      if (fromDate && d.isBefore(fromDate)) return false;
      if (toDate && d.isAfter(toDate)) return false;

      return true;
    });
  }, [history.data, search, from, to, eventTypes]);

  const cols: GridColDef[] = [
    {
      field: "event_date",
      headerName: "Date",
      width: 200,
      renderCell: (params) => {
        const row = params.row;
        if (row.event_type === "initial") return "-";

        const d =
          row.event_type === "current" ? new Date() : new Date(params.value);

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
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Link to="/manage/parts">
                <Tooltip title="Go back" placement="right">
                  <IconButton aria-label="return to reports page">
                    <ArrowBack />
                  </IconButton>
                </Tooltip>
              </Link>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <ControlledDatepicker
                sx={{ width: "100%" }}
                size="small"
                label="From"
                control={control}
                name="from"
                views={["year", "month", "day"]}
                openTo="year"
                format="YYYY MMMM DD"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <ControlledDatepicker
                sx={{ width: "100%" }}
                size="small"
                label="To"
                control={control}
                name="to"
                views={["year", "month", "day"]}
                openTo="year"
                format="YYYY MMMM DD"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <ControlledSelectNonObject
                sx={{ width: "100%" }}
                size="small"
                label="Type"
                control={control}
                name="event_types"
                multiple
                options={["initial", "used", "added", "current"]}
                getOptionLabel={(opt: EventType) =>
                  opt === "used"
                    ? "Work Orders"
                    : opt === "added"
                      ? "Parts Added"
                      : opt === "current"
                        ? "Current"
                        : "Initial"
                }
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                size="small"
                label="Search by Note"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={{ width: { xs: "100%", md: 360 } }}
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
                sx={{ height: 600 }}
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
            <Grid item xs={12}>
              <Button onClick={() => reset(defaultSchema)}>Reset</Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </BackgroundBox>
  );
};
