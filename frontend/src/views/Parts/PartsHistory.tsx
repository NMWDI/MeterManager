import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Link as RouterLink,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import {
  Breadcrumbs,
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  TextField,
  Button,
  InputAdornment,
  Snackbar,
  Alert,
  Link as MuiLink,
} from "@mui/material";
import {
  Build,
  DashboardCustomizeOutlined,
  History,
  NavigateNext,
  PlusOne,
  Save,
  Search,
} from "@mui/icons-material";
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
  IncreaseQuantityModal,
  RouterMuiLink,
} from "@/components";
import {
  useAddParts,
  useGetPartHistory,
  useGetParts,
  useUpdatePartHistory,
} from "@/service";
import { useForm } from "react-hook-form";
import { DateTimePicker } from "@mui/x-date-pickers";
import { Route } from "@/routes/manage/parts/$id/history";
import {
  EditablePartHistoryRow,
  PartHistoryResponse,
} from "@/interfaces/PartHistoryResponse";
import { useSnackbar } from "notistack";

type EventType = "initial" | "used" | "added" | "current";
const EVENT_TYPE_ORDER: EventType[] = ["initial", "used", "added", "current"];

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
  event_types: [...EVENT_TYPE_ORDER] as EventType[],
};

function normalizeEventTypes(input: unknown): EventType[] {
  const values = Array.isArray(input) ? input : [];
  const set = new Set(values);
  return EVENT_TYPE_ORDER.filter((type) => set.has(type));
}

function sameStringArray(a: string[], b: string[]) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function recalculateRows(sourceRows: any[]) {
  const initialRow = sourceRows.find((row) => row.event_type === "initial");
  const currentRow = sourceRows.find((row) => row.event_type === "current");
  const historyRows = sourceRows
    .filter(
      (row) => row.event_type !== "initial" && row.event_type !== "current",
    )
    .sort((a, b) => {
      const dateDiff =
        new Date(a.event_date).getTime() - new Date(b.event_date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return Number(a.ref_id ?? 0) - Number(b.ref_id ?? 0);
    });

  let running = Number(initialRow?.total_after ?? 0);
  const nextRows = initialRow ? [{ ...initialRow, total_after: running }] : [];

  historyRows.forEach((row) => {
    running += Number(row.delta ?? 0);
    nextRows.push({ ...row, total_after: running });
  });

  if (currentRow) {
    nextRows.push({ ...currentRow, total_after: running });
  }

  return nextRows;
}

function hydrateRows(data: PartHistoryResponse, partId?: string) {
  const raw = data.history ?? [];
  const currentRow =
    data.current_count != null
      ? {
          row_id: `current-${partId ?? "unknown"}`,
          part_id: Number(partId),
          event_date: dayjs().toISOString(),
          event_type: "current",
          ref_id: null,
          note: "Current count",
          delta: 0,
          total_after: data.current_count,
          work_order_id: null,
        }
      : null;

  return recalculateRows(currentRow ? [...raw, currentRow] : raw);
}

const PartsHistoryBreadcrumbTitle = () => {
  return (
    <Breadcrumbs
      aria-label="parts history breadcrumb"
      separator={<NavigateNext fontSize="small" />}
      sx={{
        color: "inherit",
        "& .MuiBreadcrumbs-ol": {
          alignItems: "center",
        },
        "& .MuiBreadcrumbs-separator": {
          display: "inline-flex",
          alignItems: "center",
          color: "rgba(255, 255, 255, 0.72)",
          mx: 1,
        },
      }}
    >
      <MuiLink
        component={RouterLink}
        to="/manage"
        underline="hover"
        color="inherit"
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.75,
          fontSize: "inherit",
          fontWeight: 500,
          lineHeight: 1,
        }}
      >
        <DashboardCustomizeOutlined
          sx={{ fontSize: "1.1rem", display: "block" }}
        />
        <Box component="span">Manage</Box>
      </MuiLink>
      <RouterMuiLink
        to="/manage/parts"
        search={{
          part_id: undefined,
          part_add: true,
          part_q: "",
          part_in_use: "true",
          part_commonly_used: "all",
          p_page: 0,
          p_pageSize: 25,
          meter_type_id: undefined,
          meter_type_add: true,
          meter_type_q: "",
          meter_type_in_use: "true",
          mt_page: 0,
          mt_pageSize: 25,
        }}
        underline="hover"
        color="inherit"
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.75,
          fontSize: "inherit",
          fontWeight: 500,
          lineHeight: 1,
          textDecoration: "none",
          "&:hover": {
            textDecoration: "underline",
          },
        }}
      >
        <Build sx={{ fontSize: "1.1rem", display: "block" }} />
        <Box component="span">Parts</Box>
      </RouterMuiLink>
      <Typography
        component="span"
        color="inherit"
        sx={{
          display: "inline-flex",
          alignItems: "center",
          fontSize: "inherit",
          fontWeight: 500,
          lineHeight: 1,
        }}
      >
        History
      </Typography>
    </Breadcrumbs>
  );
};

export const PartsHistory = () => {
  const { id } = useParams({ from: "/manage/parts/$id/history" });
  const navigate = useNavigate();
  const search = Route.useSearch();
  const history = useGetPartHistory(id);
  const partsList = useGetParts();
  const addParts = useAddParts();
  const { enqueueSnackbar } = useSnackbar();
  const updateHistory = useUpdatePartHistory(id, (response) => {
    const nextRows = hydrateRows(response, id);
    setRows(nextRows);
    setOriginalRows(nextRows);
    setHasChanges(false);
  });

  const [rows, setRows] = useState<any[]>([]);
  const [originalRows, setOriginalRows] = useState<any[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [increaseOpen, setIncreaseOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    message: string;
    severity: "success" | "error";
  } | null>(null);
  const isApplyingSearchToFormRef = useRef(false);

  const { control, watch, reset } = useForm<PartsHistoryFormValues>({
    resolver: yupResolver(schema),
    defaultValues: defaultSchema,
  });

  const defaultValues = useMemo<PartsHistoryFormValues>(() => {
    const normalizedTypes = normalizeEventTypes(search.type);
    return {
      from: search.from ? dayjs(search.from, "YYYY-MM-DD") : null,
      to: search.to ? dayjs(search.to, "YYYY-MM-DD") : dayjs().endOf("month"),
      event_types:
        normalizedTypes.length > 0
          ? normalizedTypes
          : defaultSchema.event_types,
    };
  }, [search.from, search.to, search.type]);

  useEffect(() => {
    isApplyingSearchToFormRef.current = true;
    reset(defaultValues);
    queueMicrotask(() => {
      isApplyingSearchToFormRef.current = false;
    });
  }, [defaultValues, reset]);

  const setSearch = (updater: (prev: typeof search) => any) => {
    navigate({
      to: "/manage/parts/$id/history",
      params: { id },
      search: (prev) => updater(prev as typeof search),
      replace: true,
    });
  };

  const from = watch("from");
  const to = watch("to");
  const eventTypes = watch("event_types");

  useEffect(() => {
    if (!history.data) return;

    const nextRows = hydrateRows(history.data, id);
    setRows(nextRows);
    setOriginalRows(nextRows);
    setHasChanges(false);
  }, [history.data, id]);

  const filteredRows = useMemo(() => {
    const q = (search.q ?? "").trim().toLowerCase();
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
  }, [rows, search.q, from, to, eventTypes]);

  useEffect(() => {
    if (isApplyingSearchToFormRef.current) return;

    const nextFrom = from ? from.format("YYYY-MM-DD") : undefined;
    const nextTo = (to ?? dayjs().endOf("month")).format("YYYY-MM-DD");
    const nextTypes = normalizeEventTypes(
      eventTypes ?? defaultSchema.event_types,
    );
    const currentTypes = normalizeEventTypes(search.type);

    const sameFrom = search.from === nextFrom;
    const sameTo = search.to === nextTo;
    const sameTypes = sameStringArray(currentTypes, nextTypes);

    if (sameFrom && sameTo && sameTypes) return;

    navigate({
      to: "/manage/parts/$id/history",
      params: { id },
      search: (prev) => ({
        ...(prev as typeof search),
        from: nextFrom,
        to: nextTo,
        type: nextTypes,
        page: 0,
      }),
      replace: true,
    });
  }, [from, to, eventTypes, id, navigate, search.from, search.to, search.type]);

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
      recalculateRows(
        prevRows.map((r) =>
          r.row_id === newRow.row_id
            ? {
                ...newRow,
                delta: Number(newRow.delta ?? 0),
                note: newRow.note ?? null,
              }
            : r,
        ),
      ),
    );

    setHasChanges(true);
    return newRow;
  }, []);

  const handleSave = async () => {
    try {
      const changedRows = rows
        .filter(
          (row) => row.event_type === "added" || row.event_type === "used",
        )
        .filter((row) => {
          const originalRow = originalRows.find(
            (candidate) => candidate.row_id === row.row_id,
          );

          if (!originalRow) return false;

          return (
            Number(originalRow.delta) !== Number(row.delta) ||
            (originalRow.note ?? "") !== (row.note ?? "") ||
            !dayjs(originalRow.event_date).isSame(dayjs(row.event_date))
          );
        })
        .map(
          (row): EditablePartHistoryRow => ({
            ref_id: Number(row.ref_id),
            event_type: row.event_type,
            event_date: dayjs(row.event_date).toISOString(),
            note: row.note ?? null,
            delta: Number(row.delta),
          }),
        );

      if (!changedRows.length) {
        setHasChanges(false);
        return;
      }

      await updateHistory.mutateAsync({ rows: changedRows });
      setSnackbar({
        message: "Changes saved successfully",
        severity: "success",
      });
    } catch {
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
          <RouterLink
            to="/workorders"
            search={{ work_order_id: [Number(params.value)] }}
          >
            WO {params.value}
          </RouterLink>
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
        <CustomCardHeader
          title={<PartsHistoryBreadcrumbTitle />}
          icon={History}
        />
        <CardContent>
          <Grid container spacing={2}>
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
                value={search.q ?? ""}
                onChange={(e) =>
                  setSearch((prev) => ({
                    ...prev,
                    q: e.target.value,
                    page: 0,
                  }))
                }
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
                pagination
                paginationModel={{
                  page: search.page,
                  pageSize: search.pageSize,
                }}
                onPaginationModelChange={(model) =>
                  setSearch((prev) => ({
                    ...prev,
                    pageSize: model.pageSize,
                    page: model.pageSize !== prev.pageSize ? 0 : model.page,
                  }))
                }
                pageSizeOptions={[10, 25, 50, 100]}
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
                                disabled={updateHistory.isLoading}
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
            <Grid item xs={12}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: { xs: "stretch", sm: "center" },
                  justifyContent: "space-between",
                  gap: 2,
                  flexDirection: { xs: "column", sm: "row" },
                }}
              >
                <Button
                  onClick={() => {
                    reset(defaultSchema);
                    setSearch((prev) => ({
                      ...prev,
                      from: undefined,
                      to: dayjs().endOf("month").format("YYYY-MM-DD"),
                      type: [...defaultSchema.event_types],
                      q: "",
                      page: 0,
                      pageSize: 25,
                    }));
                  }}
                >
                  Reset
                </Button>
                <Button
                  variant="outlined"
                  color="secondary"
                  size="small"
                  onClick={() => setIncreaseOpen(true)}
                  disabled={
                    partsList.isLoading ||
                    !partsList.data ||
                    partsList.data.length === 0
                  }
                  startIcon={<PlusOne fontSize="small" />}
                  sx={{ alignSelf: { xs: "stretch", sm: "center" } }}
                >
                  Increase Quantity
                </Button>
              </Box>
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
      <IncreaseQuantityModal
        open={increaseOpen}
        onClose={() => setIncreaseOpen(false)}
        parts={partsList.data ?? []}
        defaultPartId={id ? Number(id) : undefined}
        loading={addParts.isLoading}
        onSubmit={(payload) => {
          addParts.mutate(payload, {
            onSuccess: async () => {
              enqueueSnackbar("Quantity increase submitted successfully.", {
                variant: "success",
              });
              setIncreaseOpen(false);
              await Promise.all([partsList.refetch(), history.refetch()]);
            },
            onError: () => {
              enqueueSnackbar(
                "Failed to submit quantity increase. Please try again.",
                {
                  variant: "error",
                },
              );
            },
          });
        }}
      />
    </BackgroundBox>
  );
};
