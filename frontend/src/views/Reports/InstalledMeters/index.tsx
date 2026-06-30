import { useEffect, useMemo } from "react";
import { useAuthHeader } from "react-auth-kit";
import { EngineeringOutlined, PictureAsPdf } from "@mui/icons-material";
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Skeleton,
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
import dayjs, { Dayjs } from "dayjs";

import { API_URL } from "@/config";
import {
  BackgroundBox,
  ControlledDatepicker,
  CustomCardHeader,
  ReportBreadcrumbTitle,
} from "@/components";
import { Route } from "@/routes/reports/installedmeters";

type InstalledMeterRow = {
  id: number;
  activity_id: number;
  installed_date: string;
  serial_number: string;
  meter_owner: string | null;
  contact_name: string | null;
  water_users: string | null;
  well_ra_number: string | null;
  trss: string | null;
  price: number;
  meter_type_id: number;
  meter_type: string;
  brand: string;
  series: string | null;
  model: string;
  size: number;
  description: string;
};

type MeterTypeTotal = {
  id: number;
  meter_type: string;
  size: number;
  quantity: number;
  total_value: number;
};

type InstalledMetersReport = {
  rows: InstalledMeterRow[];
  summary: {
    quantity: number;
    total_value: number;
  };
  type_totals: MeterTypeTotal[];
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
    .test("is-at-least-min", "Max size must be at least min size", function (value) {
      const { min_size } = this.parent;
      return value == null || min_size == null || value >= min_size;
    }),
});

const formatCurrency = (value: number | null | undefined) =>
  `$${(value ?? 0).toFixed(2)}`;

const defaultDateSearch = {
  from: dayjs().startOf("month").format("YYYY-MM-DD"),
  to: dayjs().endOf("month").format("YYYY-MM-DD"),
};

export const InstalledMetersReportView = () => {
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
      to: "/reports/installedmeters",
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

  const reportQuery = useQuery<InstalledMetersReport>({
    queryKey: ["Meters", "report", "installedmeters", search],
    queryFn: async () => {
      const response = await fetch(
        `${API_URL}/meters/installed-report?${buildParams().toString()}`,
        {
          headers: { Authorization: authHeader() },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch installed meters report");
      }

      return response.json();
    },
    enabled: Boolean(search.from && search.to),
  });

  const downloadPDFMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `${API_URL}/meters/installed-report/pdf?${buildParams().toString()}`,
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
      a.download = "installed_meters_report.pdf";
      a.click();
      window.URL.revokeObjectURL(url);
    },
  });

  const rows = reportQuery.data?.rows ?? [];
  const typeTotals = reportQuery.data?.type_totals ?? [];
  const summary = reportQuery.data?.summary ?? { quantity: 0, total_value: 0 };

  const columns: GridColDef[] = [
    {
      field: "installed_date",
      headerName: "Installed Date",
      flex: 1,
      minWidth: 130,
      valueFormatter: (value: string) => dayjs(value).format("YYYY-MM-DD"),
    },
    { field: "serial_number", headerName: "Serial Number", flex: 1, minWidth: 140 },
    { field: "meter_type", headerName: "Meter Type", flex: 1.6, minWidth: 220 },
    { field: "size", headerName: "Size", flex: 0.6, minWidth: 80, type: "number" },
    { field: "well_ra_number", headerName: "RA Number", flex: 0.8, minWidth: 120 },
    { field: "trss", headerName: "TRSS", flex: 0.8, minWidth: 120 },
    { field: "water_users", headerName: "Water Users", flex: 1.2, minWidth: 160 },
    {
      field: "price",
      headerName: "Value",
      flex: 0.8,
      minWidth: 110,
      type: "number",
      valueFormatter: (value: number) => formatCurrency(value),
    },
  ];

  const typeTotalColumns: GridColDef[] = [
    { field: "meter_type", headerName: "Meter Type", flex: 1.5, minWidth: 180 },
    { field: "size", headerName: "Size", flex: 0.5, minWidth: 80, type: "number" },
    {
      field: "quantity",
      headerName: "Installed",
      flex: 0.5,
      minWidth: 90,
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
          title={<ReportBreadcrumbTitle current="Installed Meters" />}
          icon={EngineeringOutlined}
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
              sx={{ display: "flex", justifyContent: { xs: "center", md: "flex-end" } }}
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

          <Grid container spacing={2} px={2} pb={2}>
            <Grid item xs={12} md={4}>
              <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Total Meters Installed
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {summary.quantity}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Total Value
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {formatCurrency(summary.total_value)}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Meter Types Installed
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
                        label: "Meters Installed",
                      },
                    ]}
                  />
                ) : (
                  <Typography color="text.secondary">
                    No installed meters found.
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
                  ...defaultDateSearch,
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
