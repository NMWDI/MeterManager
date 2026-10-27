import { useEffect, useMemo } from "react";
import { useAuthHeader } from "@/utils/AuthKitCompat";
import { PictureAsPdf, Storage } from "@mui/icons-material";
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { BarChart } from "@mui/x-charts";
import { useNavigate } from "@tanstack/react-router";
import { Controller, useForm } from "react-hook-form";
import { useMutation, useQuery } from "react-query";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { DataGrid, GridColDef } from "@mui/x-data-grid";

import { API_URL } from "@/config";
import {
  BackgroundBox,
  ControlledDatepicker,
  CustomCardHeader,
  ReportBreadcrumbTitle,
} from "@/components";
import { Route } from "@/routes/reports/storedmeters";
import dayjs, { Dayjs } from "dayjs";

type StoredMeterRow = {
  id: number;
  store_activity_id: number;
  stored_date: string;
  serial_number: string;
  meter_owner: string | null;
  contact_name: string | null;
  status: string;
  price: number;
  meter_type_id: number;
  meter_type: string;
  brand: string;
  series: string | null;
  model: string;
  size: number | null;
  description: string;
};

type StoredMeterTimelineItem = {
  id: number;
  activity_id: number;
  meter_id: number;
  serial_number: string;
  meter_type_id: number;
  meter_type: string;
  stored_date: string;
  out_of_storage_date: string | null;
  out_of_storage_activity_type: string | null;
  is_currently_stored: boolean;
};

type MeterTypeTotal = {
  id: number;
  meter_type: string;
  size: number | null;
  quantity: number;
  total_value: number;
};

type StoredMetersReport = {
  rows: StoredMeterRow[];
  summary: {
    quantity: number;
    total_value: number;
  };
  type_totals: MeterTypeTotal[];
  timeline: StoredMeterTimelineItem[];
};

type FormValues = {
  from: Dayjs;
  to: Dayjs;
  min_size?: number | null;
  max_size?: number | null;
};

const schema = yup.object().shape({
  from: yup.mixed<Dayjs>().nullable().required("From date is required"),
  to: yup
    .mixed<Dayjs>()
    .nullable()
    .required("To date is required")
    .test("is-after", "'To' date must be on or after 'From'", function (value) {
      const { from } = this.parent;
      return !from || !value || !dayjs(value).isBefore(dayjs(from), "day");
    }),
  min_size: yup.number().nullable().min(0).integer(),
  max_size: yup
    .number()
    .nullable()
    .min(0)
    .integer()
    .test(
      "is-at-least-min",
      "Max size must be at least min size",
      function (value) {
        const { min_size } = this.parent;
        return value == null || min_size == null || value >= min_size;
      },
    ),
});

const formatCurrency = (value: number | null | undefined) =>
  `$${(value ?? 0).toFixed(2)}`;

const formatSize = (value: number | null | undefined) =>
  value == null ? "" : value.toString();

const defaultDateSearch = {
  from: dayjs().startOf("month").format("YYYY-MM-DD"),
  to: dayjs().endOf("month").format("YYYY-MM-DD"),
};

const StorageTimelineChart = ({
  items,
  from,
  to,
}: {
  items: StoredMeterTimelineItem[];
  from: string;
  to: string;
}) => {
  const rangeStart = dayjs(from).startOf("day");
  const rangeEnd = dayjs(to).endOf("day");
  const rangeMs = Math.max(rangeEnd.diff(rangeStart), 1);

  if (!items.length) {
    return (
      <Typography color="text.secondary">
        No storage activity found for this range.
      </Typography>
    );
  }

  return (
    <Box sx={{ minWidth: 720 }}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "160px 1fr",
          gap: 1,
          mb: 1,
          color: "text.secondary",
        }}
      >
        <Typography variant="caption">{rangeStart.format("YYYY-MM-DD")}</Typography>
        <Typography variant="caption" sx={{ textAlign: "right" }}>
          {rangeEnd.format("YYYY-MM-DD")}
        </Typography>
      </Box>
      <Stack spacing={1}>
        {items.map((item) => {
          const storedDate = dayjs(item.stored_date);
          const outDate = item.out_of_storage_date
            ? dayjs(item.out_of_storage_date)
            : rangeEnd;
          const clippedStart = storedDate.isBefore(rangeStart)
            ? rangeStart
            : storedDate;
          const clippedEnd = outDate.isAfter(rangeEnd) ? rangeEnd : outDate;
          const left = Math.max(0, (clippedStart.diff(rangeStart) / rangeMs) * 100);
          const width = Math.max(
            1,
            (clippedEnd.diff(clippedStart) / rangeMs) * 100,
          );

          return (
            <Box
              key={item.id}
              sx={{
                display: "grid",
                gridTemplateColumns: "160px 1fr",
                gap: 1,
                alignItems: "center",
              }}
            >
              <Typography variant="body2" noWrap title={item.serial_number}>
                {item.serial_number}
              </Typography>
              <Box
                sx={{
                  position: "relative",
                  height: 28,
                  borderRadius: 1,
                  backgroundColor: "action.hover",
                  overflow: "hidden",
                }}
              >
                <Tooltip
                  title={`${item.serial_number} stored ${storedDate.format(
                    "YYYY-MM-DD",
                  )} to ${
                    item.out_of_storage_date
                      ? `${outDate.format("YYYY-MM-DD")} (${item.out_of_storage_activity_type})`
                      : "still stored"
                  }`}
                >
                  <Box
                    sx={{
                      position: "absolute",
                      left: `${left}%`,
                      width: `${width}%`,
                      minWidth: 8,
                      top: 4,
                      bottom: 4,
                      borderRadius: 1,
                      backgroundColor: item.is_currently_stored
                        ? "primary.main"
                        : "grey.600",
                    }}
                  />
                </Tooltip>
              </Box>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
};

export const StoredMetersReportView = () => {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const authHeader = useAuthHeader();

  const defaultValues = useMemo<FormValues>(
    () => ({
      from: dayjs(search.from, "YYYY-MM-DD"),
      to: dayjs(search.to, "YYYY-MM-DD"),
      min_size: search.min_size ?? null,
      max_size: search.max_size ?? null,
    }),
    [search.from, search.to, search.min_size, search.max_size],
  );

  const { control, reset, watch } = useForm<FormValues>({
    resolver: yupResolver(schema),
    defaultValues,
  });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const from = watch("from");
  const to = watch("to");
  const minSize = watch("min_size");
  const maxSize = watch("max_size");

  const setSearch = (updater: (prev: typeof search) => any) => {
    navigate({
      to: "/reports/storedmeters",
      search: (prev) => updater(prev as any),
      replace: true,
    });
  };

  useEffect(() => {
    const nextFrom = from?.format("YYYY-MM-DD");
    const nextTo = to?.format("YYYY-MM-DD");
    const nextMinSize = minSize ?? undefined;
    const nextMaxSize = maxSize ?? undefined;

    setSearch((prev) => {
      if (
        prev.from === nextFrom &&
        prev.to === nextTo &&
        prev.min_size === nextMinSize &&
        prev.max_size === nextMaxSize
      ) {
        return prev;
      }

      return {
        ...prev,
        from: nextFrom,
        to: nextTo,
        min_size: nextMinSize,
        max_size: nextMaxSize,
        page: 0,
      };
    });
  }, [from, to, minSize, maxSize]);

  const buildParams = () => {
    const params = new URLSearchParams({
      from_date: search.from,
      to_date: search.to,
    });

    if (search.min_size != null) {
      params.set("min_size", search.min_size.toString());
    }
    if (search.max_size != null) {
      params.set("max_size", search.max_size.toString());
    }

    return params;
  };

  const reportQuery = useQuery<StoredMetersReport>({
    queryKey: ["Meters", "report", "storedmeters", search],
    queryFn: async () => {
      const response = await fetch(
        `${API_URL}/meters/stored-report?${buildParams().toString()}`,
        {
          headers: { Authorization: authHeader() },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch stored meters report");
      }

      return response.json();
    },
    enabled: Boolean(search.from && search.to),
  });

  const downloadPDFMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `${API_URL}/meters/stored-report/pdf?${buildParams().toString()}`,
        {
          headers: { Authorization: authHeader() },
        },
      );

      if (!response.ok) {
        throw new Error("PDF generation failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "stored_meters_report.pdf";
      a.click();
      window.URL.revokeObjectURL(url);
    },
  });

  const rows = reportQuery.data?.rows ?? [];
  const typeTotals = reportQuery.data?.type_totals ?? [];
  const timeline = reportQuery.data?.timeline ?? [];
  const summary = reportQuery.data?.summary ?? { quantity: 0, total_value: 0 };

  const columns: GridColDef[] = [
    {
      field: "stored_date",
      headerName: "Stored Date",
      flex: 1,
      minWidth: 130,
      valueFormatter: (value: string) => dayjs(value).format("YYYY-MM-DD"),
    },
    {
      field: "serial_number",
      headerName: "Serial Number",
      flex: 1,
      minWidth: 140,
    },
    { field: "meter_type", headerName: "Meter Type", flex: 1.6, minWidth: 220 },
    {
      field: "size",
      headerName: "Size",
      flex: 0.6,
      minWidth: 80,
      type: "number",
      valueFormatter: (value: number | null) => formatSize(value),
      align: "left",
      headerAlign: "left",
    },
    { field: "status", headerName: "Status", flex: 0.8, minWidth: 120 },
    {
      field: "price",
      headerName: "Value",
      flex: 0.8,
      minWidth: 110,
      type: "number",
      valueFormatter: (value: number) => formatCurrency(value),
      align: "left",
      headerAlign: "left",
    },
    { field: "contact_name", headerName: "Contact", flex: 1, minWidth: 140 },
    { field: "meter_owner", headerName: "Owner", flex: 1, minWidth: 120 },
  ];

  const typeTotalColumns: GridColDef[] = [
    { field: "meter_type", headerName: "Meter Type", flex: 1.5, minWidth: 180 },
    {
      field: "size",
      headerName: "Size",
      flex: 0.5,
      minWidth: 80,
      type: "number",
      valueFormatter: (value: number | null) => formatSize(value),
    },
    {
      field: "quantity",
      headerName: "Stored",
      flex: 0.5,
      minWidth: 80,
      type: "number",
    },
    {
      field: "total_value",
      headerName: "Total Value",
      flex: 0.8,
      minWidth: 120,
      type: "number",
      valueFormatter: (value: number) => formatCurrency(value),
    },
  ];

  return (
    <BackgroundBox>
      <Card sx={{ height: "fit-content" }}>
        <CustomCardHeader
          title={<ReportBreadcrumbTitle current="Stored Meters" />}
          icon={Storage}
        />
        <CardContent>
          <Grid container spacing={2} padding={2} alignItems="center">
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
            <Grid item xs={12} sm={6} md={2}>
              <Controller
                name="min_size"
                control={control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    value={field.value ?? ""}
                    onChange={(event) =>
                      field.onChange(
                        event.target.value === ""
                          ? null
                          : Number(event.target.value),
                      )
                    }
                    fullWidth
                    size="small"
                    type="number"
                    label="Min Size"
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    inputProps={{ min: 0, step: 1 }}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Controller
                name="max_size"
                control={control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    value={field.value ?? ""}
                    onChange={(event) =>
                      field.onChange(
                        event.target.value === ""
                          ? null
                          : Number(event.target.value),
                      )
                    }
                    fullWidth
                    size="small"
                    type="number"
                    label="Max Size"
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    inputProps={{ min: 0, step: 1 }}
                  />
                )}
              />
            </Grid>
            <Grid
              item
              xs={12}
              md={2}
              sx={{
                display: "flex",
                justifyContent: { xs: "center", md: "flex-end" },
              }}
            >
              <Tooltip title="Export report as PDF" placement="top">
                <span>
                  <Button
                    variant="outlined"
                    startIcon={<PictureAsPdf />}
                    aria-label="export report as pdf"
                    onClick={() => downloadPDFMutation.mutate()}
                    disabled={downloadPDFMutation.isLoading}
                    sx={{ whiteSpace: "nowrap" }}
                  >
                    PDF
                  </Button>
                </span>
              </Tooltip>
            </Grid>
          </Grid>

          <Box px={2} pb={2}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Storage Timeline
            </Typography>
            {reportQuery.isLoading ? (
              <Skeleton variant="rounded" width="100%" height={320} />
            ) : (
              <Box sx={{ overflowX: "auto", pb: 1 }}>
                <StorageTimelineChart
                  items={timeline}
                  from={search.from}
                  to={search.to}
                />
              </Box>
            )}
          </Box>

          <Grid container spacing={2} px={2} pb={2}>
            <Grid item xs={12} md={4}>
              <Box
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                  p: 2,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Total Meters Stored
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {summary.quantity}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                  p: 2,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Total Value
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {formatCurrency(summary.total_value)}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                  p: 2,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Meter Types Stored
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {typeTotals.length}
                </Typography>
              </Box>
            </Grid>
          </Grid>

          <Box px={2} pb={2}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Meter Type Totals
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} lg={7}>
                {reportQuery.isLoading ? (
                  <Skeleton variant="rounded" width="100%" height={300} />
                ) : typeTotals.length ? (
                  <BarChart
                    height={300}
                    xAxis={[
                      {
                        scaleType: "band",
                        data: typeTotals.map((row) => row.meter_type),
                      },
                    ]}
                    series={[
                      {
                        data: typeTotals.map((row) => row.quantity),
                        label: "Meters Stored",
                      },
                    ]}
                  />
                ) : (
                  <Typography color="text.secondary">
                    No stored meters found.
                  </Typography>
                )}
              </Grid>
              <Grid item xs={12} lg={5}>
                <DataGrid
                  rows={typeTotals}
                  columns={typeTotalColumns}
                  loading={reportQuery.isLoading}
                  disableColumnMenu
                  hideFooterSelectedRowCount
                  pageSizeOptions={[5, 10, 25]}
                  initialState={{
                    pagination: { paginationModel: { page: 0, pageSize: 5 } },
                  }}
                  sx={{ minHeight: 300 }}
                />
              </Grid>
            </Grid>
          </Box>

          <Box px={2} pb={2}>
            <DataGrid
              rows={rows}
              columns={columns}
              loading={reportQuery.isLoading}
              disableColumnMenu
              hideFooterSelectedRowCount
              pagination
              pageSizeOptions={[5, 10, 25, 50]}
              paginationModel={{ page: search.page, pageSize: search.pageSize }}
              onPaginationModelChange={(model) =>
                setSearch((prev) => ({
                  ...prev,
                  pageSize: model.pageSize,
                  page: model.pageSize !== prev.pageSize ? 0 : model.page,
                }))
              }
            />
          </Box>

          <Box px={2}>
            <Button
              onClick={() => {
                reset({
                  from: dayjs(defaultDateSearch.from, "YYYY-MM-DD"),
                  to: dayjs(defaultDateSearch.to, "YYYY-MM-DD"),
                  min_size: null,
                  max_size: null,
                });
                setSearch((prev) => ({
                  ...prev,
                  from: defaultDateSearch.from,
                  to: defaultDateSearch.to,
                  min_size: undefined,
                  max_size: undefined,
                  page: 0,
                  pageSize: 10,
                }));
              }}
            >
              Reset
            </Button>
          </Box>
        </CardContent>
      </Card>
    </BackgroundBox>
  );
};
