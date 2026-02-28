import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
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
  Snackbar,
  Alert,
} from "@mui/material";
import { ArrowBack, History, Save, Search } from "@mui/icons-material";
import {
  DataGrid,
  GridColDef,
  GridFooter,
  GridFooterContainer,
} from "@mui/x-data-grid";
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
import { DateTimePicker } from "@mui/x-date-pickers";

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
  const { id } = useParams({ from: "/manage/parts/$id/history" });
  const history = useGetPartHistory(id);
  const [search, setSearch] = useState("");

  const [rows, setRows] = useState<any[]>([]);
  const [originalRows, setOriginalRows] = useState<any[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    message: string;
    severity: "success" | "error";
  } | null>(null);

  const { control, watch, reset } = useForm<PartsHistoryFormValues>({
    resolver: yupResolver(schema),
    defaultValues: defaultSchema,
  });

  const from = watch("from");
  const to = watch("to");
  const eventTypes = watch("event_types");

  useEffect(() => {
    if (!history.data) return;

    const raw = history.data.history ?? [];
    const currentRow =
      history.data.current_count != null
        ? {
            row_id: `current-${id ?? "unknown"}`,
            part_id: Number(id),
            event_date: dayjs().toISOString(),
            event_type: "current",
            ref_id: null,
            note: "Current count",
            delta: 0,
            total_after: history.data.current_count,
            work_order_id: null,
          }
        : null;

    const withCurrent = currentRow ? [...raw, currentRow] : raw;
    setRows(withCurrent);
    setOriginalRows(withCurrent); // snapshot on load
    setHasChanges(false);
  }, [history.data, id]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const fromDate = from ? dayjs(from).startOf("day") : null;
    const toDate = to ? dayjs(to).endOf("day") : null;
    const selectedTypes = new Set((eventTypes ?? []) as string[]);

    return rows.filter((r: any) => {
      if (selectedTypes.size && !selectedTypes.has(r.event_type)) return false;
      if (q && !(r.note ?? "").toLowerCase().includes(q)) return false;

      if (r.event_type === "initial" || r.event_type === "current") {
        return selectedTypes.has(r.event_type);
      }

      const d = dayjs(r.event_date);
      if (fromDate && d.isBefore(fromDate)) return false;
      if (toDate && d.isAfter(toDate)) return false;
      return true;
    });
  }, [rows, search, from, to, eventTypes]);

  const processRowUpdate = useCallback((newRow: any, _oldRow: any) => {
    if (newRow.delta !== undefined && isNaN(Number(newRow.delta))) {
      throw new Error("Delta must be a number");
    }

    if (newRow.event_type === "used") {
      const deltaNum = Number(newRow.delta ?? 0);

      if (deltaNum >= 0) {
        throw new Error(
          "Delta for work order usage ('used') must be negative (parts removed)",
        );
      }
    }

    if (newRow.event_type === "added" && Number(newRow.delta ?? 0) <= 0) {
      throw new Error("Delta for added parts must be positive");
    }

    setRows((prevRows) =>
      prevRows.map((r) => (r.row_id === newRow.row_id ? { ...newRow } : r)),
    );

    setHasChanges(true);
    return newRow;
  }, []);

  const handleSave = async () => {
    try {
      // Example: await updatePartHistory(id, rows);
      // For now, just simulate success
      setOriginalRows(rows); // accept changes
      setHasChanges(false);
      setSnackbar({
        message: "Changes saved successfully",
        severity: "success",
      });
    } catch (err) {
      setSnackbar({ message: "Failed to save changes", severity: "error" });
    }
  };

  const handleDiscard = () => {
    setRows(originalRows);
    setHasChanges(false);
    setSnackbar({ message: "Changes discarded", severity: "success" });
  };

  const cols: GridColDef[] = [
    {
      field: "event_date",
      headerName: "Date",
      width: 250,
      editable: true,
      renderCell: (params) => {
        const row = params.row;
        if (row.event_type === "initial") return "-";

        const d =
          row.event_type === "current" ? new Date() : new Date(params.value);

        return isNaN(d.getTime())
          ? String(params.value)
          : dayjs(d).format("MMM D, YYYY h:mm A");
      },
      renderEditCell: (params) => {
        const { id, value, api } = params;

        return (
          <DateTimePicker
            value={value ? dayjs(value) : null}
            onChange={(newValue) => {
              if (newValue) {
                api.setEditCellValue({
                  id,
                  field: "event_date",
                  value: newValue.toISOString(),
                });
              }
            }}
            slotProps={{
              textField: {
                variant: "outlined",
                size: "small",
                autoFocus: true,
                fullWidth: true,
              },
            }}
            format="MMM D, YYYY h:mm A"
          />
        );
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
      editable: true,
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
      preProcessEditCellProps: (params) => {
        const hasError =
          params.row.event_type === "used" &&
          Number(params.props.value ?? 0) >= 0;

        return { ...params.props, error: hasError };
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
            to="/workorders"
            search={{ work_order_id: [Number(params.value)] }}
          >
            WO {params.value}
          </Link>
        ) : (
          "N/A"
        ),
    },
    {
      field: "note",
      editable: true,
      headerName: "Note",
      flex: 1,
      minWidth: 240,
      cellClassName: (params) =>
        params.row.event_type === "initial" ||
        params.row.event_type === "current"
          ? "disabled-cell"
          : "",
    },
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
                rows={filteredRows}
                getRowId={(row) => row.row_id}
                loading={history.isLoading}
                columns={cols}
                processRowUpdate={processRowUpdate}
                disableRowSelectionOnClick
                disableColumnMenu
                disableColumnFilter
                hideFooterSelectedRowCount
                editMode="row"
                isCellEditable={(params) => {
                  return (
                    params.row.event_type !== "initial" &&
                    params.row.event_type !== "current"
                  );
                }}
                initialState={{
                  sorting: {
                    sortModel: [{ field: "event_date", sort: "asc" }],
                  },
                }}
                slots={{
                  footer: () => {
                    return (
                      <GridFooterContainer
                        sx={{ py: 0.5, px: 2, justifyContent: "space-between" }}
                      >
                        <Box
                          sx={{ display: "flex", gap: 3, alignItems: "center" }}
                        >
                          {hasChanges && (
                            <>
                              <Button
                                size="small"
                                onClick={handleDiscard}
                                color="error"
                              >
                                Discard
                              </Button>

                              <Button
                                variant="contained"
                                color="success"
                                onClick={handleSave}
                                sx={{
                                  flexShrink: 0,
                                  width: { xs: "100%", sm: "auto" },
                                }}
                                startIcon={<Save fontSize="small" />}
                              >
                                Save
                              </Button>
                            </>
                          )}
                        </Box>
                        <GridFooter sx={{ border: "none" }} />
                      </GridFooterContainer>
                    );
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} justifyContent="space-around">
              <Button onClick={() => reset(defaultSchema)}>Reset</Button>
              {hasChanges && <Box display="flex" gap={2}></Box>}
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      <Snackbar
        open={!!snackbar}
        autoHideDuration={4000}
        onClose={() => setSnackbar(null)}
      >
        <Alert severity={snackbar?.severity} onClose={() => setSnackbar(null)}>
          {snackbar?.message}
        </Alert>
      </Snackbar>
    </BackgroundBox>
  );
};
