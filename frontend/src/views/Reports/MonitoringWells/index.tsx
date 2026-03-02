/** @jsxImportSource @emotion/react */
import { useMemo, useEffect, useRef } from "react";
import { ArrowBack, PictureAsPdf, MonitorHeart } from "@mui/icons-material";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  Grid,
  IconButton,
  InputLabel,
  ListSubheader,
  MenuItem,
  Select,
  Switch,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { LineChart } from "@mui/x-charts";
import { css } from "@emotion/react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useAuthHeader } from "react-auth-kit";
import { Controller, useForm } from "react-hook-form";
import { useMutation, useQuery } from "react-query";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import dayjs, { Dayjs } from "dayjs";
import {
  ControlledDatepicker,
  ControlledAutocomplete,
  BackgroundBox,
  CustomCardHeader,
} from "@/components";
import { MonitoredWell, WellMeasurementDTO } from "@/interfaces";
import { ReportAveragesResponse } from "@/interfaces/ReportAveragesResponse";
import { useFetchWithAuth } from "@/hooks";
import { separateAndSortMonitoredWells } from "@/utils";
import { API_URL } from "@/config";
import { Route } from "@/routes/reports/monitoringwells";

type FormValues = {
  from: Dayjs;
  to: Dayjs;
  wells: (MonitoredWell & { group?: string | null })[];
  isAveragingAllWells: boolean;
  isComparingTo1970Average: boolean;
  comparisonYear: number | null;
};

const schema = yup.object({
  from: yup
    .mixed<Dayjs>()
    .test("is-dayjs", "From date is required", (v) => dayjs.isDayjs(v))
    .required(),
  to: yup
    .mixed<Dayjs>()
    .test("is-dayjs", "To date is required", (v) => dayjs.isDayjs(v))
    .required()
    .test("is-after", "'To' date must be after 'From'", function (value) {
      const { from } = this.parent as FormValues;
      return !from || !value || dayjs(value).isAfter(dayjs(from));
    }),
  wells: yup
    .array()
    .of(
      yup.object({
        id: yup.number().required(),
        name: yup.string().required(),
        ra_number: yup.string().required(),
        datastream_id: yup.number().required(),
        well_status: yup.mixed().required(),
        outside_recorder: yup.boolean().nullable(),
        chloride_group_id: yup.number().nullable(),
        group: yup.string().nullable(),
      }),
    )
    .min(1, "At least one Well is required")
    .required(),
  isAveragingAllWells: yup.boolean().required(),
  isComparingTo1970Average: yup.boolean().required(),
  comparisonYear: yup.number().nullable().default(null),
});

const isoToDayjs = (s?: string, fallback?: Dayjs) =>
  s ? dayjs(s, "YYYY-MM-DD") : (fallback ?? dayjs());
const dayjsToIso = (d?: dayjs.Dayjs | null) =>
  d ? d.format("YYYY-MM-DD") : undefined;

const hardResetFormValues: FormValues = {
  from: dayjs().startOf("month"),
  to: dayjs().endOf("month"),
  wells: [],
  isAveragingAllWells: false,
  isComparingTo1970Average: false,
  comparisonYear: null,
};

const hardResetSearch = {
  from: hardResetFormValues.from.format("YYYY-MM-DD"),
  to: hardResetFormValues.to.format("YYYY-MM-DD"),
  well_ids: [] as number[],
  avgAll: false,
  cmp1970: false,
  cmpYear: undefined as number | undefined,
  m_page: 0,
  m_pageSize: 5,
  a_page: 0,
  a_pageSize: 5,
};

export const MonitoringWellsReportView = () => {
  const navigate = useNavigate();
  const search = Route.useSearch();

  const hydratedRef = useRef(false);

  // URL -> form defaults
  const defaultValues = useMemo<FormValues>(() => {
    const fallbackFrom = dayjs().startOf("month");
    const fallbackTo = dayjs().endOf("month");

    return {
      from: isoToDayjs(search.from, fallbackFrom),
      to: isoToDayjs(search.to, fallbackTo),
      wells: [], // hydrate later
      isAveragingAllWells: search.avgAll,
      isComparingTo1970Average: search.cmp1970,
      comparisonYear: search.cmpYear ?? null,
    };
  }, [search.from, search.to, search.avgAll, search.cmp1970, search.cmpYear]);

  const theme = useTheme();
  const baseStyle = css`
  font-weight: 500;
  padding: 8px 16px;
  border-radius: 4px;
  margin: 2px 4px;
  cursor: pointer;
  transition: background-color 0.2s ease;
`;
  const selectedStyle = (isOutside: boolean, theme: any) => css`
    background-color: ${isOutside
      ? theme.palette.secondary.dark
      : theme.palette.primary.dark} !important;
    color: ${isOutside
      ? theme.palette.secondary.contrastText
      : theme.palette.primary.contrastText} !important;
    font-weight: 500;
  `;

  const hoverStyle = (isOutside: boolean, theme: any) => css`
    &:hover {
      background-color: ${isOutside
        ? theme.palette.secondary.main
        : theme.palette.primary.main} !important;
      color: ${isOutside
        ? theme.palette.secondary.contrastText
        : theme.palette.primary.contrastText} !important;
    }
  `;

  const authHeader = useAuthHeader();
  const fetchWithAuth = useFetchWithAuth();
  const monitoredWellsQuery = useQuery<
    { items: MonitoredWell[] },
    Error,
    MonitoredWell[]
  >({
    queryKey: ["wells"],
    queryFn: () =>
      fetchWithAuth({
        method: "GET",
        route: "/wells",
        params: {
          search_string: "monitoring",
          sort_by: "name",
          sort_direction: "asc",
        },
      }),
    select: (res) => res.items,
  });

  const { control, reset, watch, setValue } = useForm<FormValues>({
    resolver: yupResolver(schema) as any,
    defaultValues,
  });

  useEffect(() => {
    if (!monitoredWellsQuery.data) return;

    const idSet = new Set(search.well_ids ?? []);
    const selected = groupedWells.filter((w) => idSet.has(w.id));

    setValue("wells", selected, { shouldDirty: false, shouldValidate: true });

    // mark hydrated AFTER we apply the URL -> form
    hydratedRef.current = true;
  }, [monitoredWellsQuery.data, search.well_ids, setValue]);

  const setSearch = (updater: (prev: typeof search) => any) => {
    navigate({
      to: "/reports/monitoringwells",
      search: (prev) => updater(prev as any),
      replace: true,
    });
  };

  const from = watch("from");
  const to = watch("to");

  useEffect(() => {
    const fromIso = dayjsToIso(from);
    const toIso = dayjsToIso(to);

    setSearch((prev) => ({
      ...(prev as any),
      from: fromIso ?? prev.from,
      to: toIso ?? prev.to,
      // reset paginations when filters change
      m_page: 0,
      a_page: 0,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from?.valueOf(), to?.valueOf()]);

  const wells = watch("wells");
  const wellIds = useMemo(() => wells?.map((w) => w.id) ?? [], [wells]);

  useEffect(() => {
    // Don't overwrite URL before we've hydrated from it
    if (!hydratedRef.current) return;

    setSearch((prev) => ({
      ...(prev as any),
      well_ids: wellIds.length ? wellIds : [],
      m_page: 0,
      a_page: 0,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wellIds.join(",")]);

  const avgAll = watch("isAveragingAllWells");
  const cmp1970 = watch("isComparingTo1970Average");
  const cmpYear = watch("comparisonYear");

  useEffect(() => {
    if (!hydratedRef.current) return;

    setSearch((prev) => ({
      ...(prev as any),
      avgAll: !!avgAll,
      cmp1970: !!cmp1970,
      cmpYear: cmpYear ? Number(cmpYear) : undefined,
      m_page: 0,
      a_page: 0,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avgAll, cmp1970, cmpYear]);

  const manualMeasurementsQuery = useQuery<WellMeasurementDTO[], Error>({
    queryKey: [
      "manualMeasurements",
      wellIds,
      from,
      to,
      avgAll,
      cmp1970,
      cmpYear,
    ],
    queryFn: () => {
      const searchParams = new URLSearchParams({
        from_date: from?.format("YYYY-MM-DD"),
        to_date: to?.format("YYYY-MM-DD"),
        isAveragingAllWells: avgAll.toString(),
        isComparingTo1970Average: cmp1970.toString(),
        comparisonYear: cmpYear ? cmpYear.toString() : "",
      });

      wellIds.forEach((id: number) => {
        searchParams.append("well_ids", id.toString());
      });

      return fetchWithAuth({
        method: "GET",
        route: `/waterlevels?${searchParams.toString()}`,
      });
    },
    enabled: wellIds.length > 0 && !!from && !!to,
  });

  const reportAveragesQuery = useQuery<ReportAveragesResponse, Error>({
    queryKey: ["reportAverages", wellIds, from, to],
    queryFn: () => {
      const params = new URLSearchParams({
        from_date: from?.format("YYYY-MM-DD"),
        to_date: to?.format("YYYY-MM-DD"),
      });

      wellIds.forEach((id: number) => params.append("well_ids", id.toString()));

      return fetchWithAuth({
        method: "GET",
        route: `/waterlevels/report-averages?${params.toString()}`,
      });
    },
    enabled: wellIds.length > 0 && !!from && !!to,
  });

  const columns: GridColDef[] = [
    {
      field: "well",
      headerName: "Well",
      flex: 1,
    },
    {
      field: "date_time",
      headerName: "Date / Time",
      flex: 1,
      valueFormatter: (date) => {
        if (!date) return "—";
        return dayjs(date).format("MMM D, YYYY h:mm A");
      },
    },
    {
      field: "depth_to_water",
      headerName: "Depth To Water (ft)",
      type: "number",
      flex: 1,
    },
  ];

  const tableRows =
    manualMeasurementsQuery?.data?.map(
      (manualMeasurement: WellMeasurementDTO) => ({
        id: manualMeasurement.id,
        date_time: manualMeasurement.timestamp,
        depth_to_water: manualMeasurement.value,
        well: manualMeasurement.well.ra_number,
      }),
    ) ?? [];

  const groupedByWell = useMemo(() => {
    const groups: Record<string, { x: Date; y: number }[]> = {};

    const fromYear = dayjs(watch("from")).year();
    const isComparingTo1970Average = watch("isComparingTo1970Average");
    const comparisonYear = watch("comparisonYear");

    manualMeasurementsQuery?.data?.forEach((m) => {
      const wellName = m.well.ra_number as string;

      // Detect series like "1970 Average" or "2021 Average"
      const match = /^(\d{4}) Average$/.exec(wellName);
      const seriesYear = match ? Number(match[1]) : undefined;

      let timestamp = m.timestamp;

      // Timeshift ONLY the comparison series that are actually enabled/selected
      const shouldShift =
        (isComparingTo1970Average && seriesYear === 1970) ||
        (comparisonYear !== undefined &&
          !Number.isNaN(comparisonYear) &&
          seriesYear === comparisonYear);

      if (shouldShift) {
        const d = dayjs(timestamp);
        timestamp = d.set("year", fromYear).toDate();
      }

      if (!groups[wellName]) groups[wellName] = [];
      groups[wellName].push({ x: timestamp, y: m.value });
    });

    return groups;
  }, [
    manualMeasurementsQuery?.data,
    watch("from"),
    watch("isComparingTo1970Average"),
    watch("comparisonYear"),
  ]);

  const allTimestamps = useMemo(() => {
    const timestamps = new Set<number>();
    Object.values(groupedByWell).forEach((entries) =>
      entries.forEach((e) => {
        const ts = new Date(e.x).getTime();
        if (!isNaN(ts)) timestamps.add(ts);
      }),
    );
    return Array.from(timestamps).sort((a, b) => a - b);
  }, [groupedByWell]);

  const series = useMemo(() => {
    return Object.entries(groupedByWell).map(([wellName, entries]) => {
      const dataMap = new Map(
        entries.map((e) => [new Date(e.x).getTime(), e.y]),
      );
      const data = allTimestamps.map((ts) => {
        const value = dataMap.get(ts);
        return typeof value === "number" && !isNaN(value) ? value : null;
      });
      return {
        label: wellName,
        data,
        connectNulls: true,
      };
    });
  }, [groupedByWell, allTimestamps]);

  const [outsideRecorderWells, regularWells] = separateAndSortMonitoredWells(
    monitoredWellsQuery?.data,
  );
  const groupedWells = [
    ...regularWells.map((well) => ({ ...well, group: "Wells" })),
    ...outsideRecorderWells.map((well) => ({
      ...well,
      group: "Outside Recorder Wells",
    })),
  ];

  const allWellsLatest = useMemo(() => {
    const rows = reportAveragesQuery.data?.all_wells ?? [];
    if (!rows.length) return null;
    // assume period_start sorts ascending as ISO; if not, sort
    const sorted = [...rows].sort(
      (a, b) =>
        dayjs(a.period_start).valueOf() - dayjs(b.period_start).valueOf(),
    );
    return sorted[sorted.length - 1];
  }, [reportAveragesQuery.data]);

  const bucketLabel =
    reportAveragesQuery.data?.bucket === "year" ? "Year" : "Month";

  const bucket = reportAveragesQuery.data?.bucket ?? "month";

  const formatPeriodLabel = (periodStart: string) => {
    const d = dayjs(periodStart);
    if (!d.isValid()) return periodStart;

    return bucket === "year" ? d.format("YYYY") : d.format("MMM YYYY");
  };

  const avgColumns: GridColDef[] = [
    {
      field: "well",
      headerName: "Well",
      flex: 1,
    },
    {
      field: "period",
      headerName: bucket === "year" ? "Year" : "Month",
      flex: 1,
      sortComparator: (a, b) => dayjs(a).valueOf() - dayjs(b).valueOf(),
    },
    {
      field: "avg",
      headerName: "Average Depth To Water (ft)",
      type: "number",
      flex: 1,
      valueFormatter: (avg?: number | null) =>
        typeof avg === "number" ? avg?.toFixed(2) : "—",
    },
  ];

  const avgRows =
    reportAveragesQuery.data?.per_well?.map((r) => ({
      id: `${r.well_id}-${r.period_start}`,
      period_start: r.period_start, // keep raw
      period: formatPeriodLabel(r.period_start),
      well: r.ra_number,
      avg: r.avg_value,
    })) ?? [];

  const downloadPDFMutation = useMutation({
    mutationFn: async ({
      from,
      to,
      wellIds,
      isAveragingAllWells,
      isComparingTo1970Average,
      comparisonYear,
    }: {
      from: Dayjs;
      to: Dayjs;
      wellIds: number[];
      isAveragingAllWells: boolean;
      isComparingTo1970Average: boolean;
      comparisonYear: string;
    }) => {
      const params = new URLSearchParams({
        from_date: from?.format("YYYY-MM-DD"),
        to_date: to?.format("YYYY-MM-DD"),
        isAveragingAllWells: isAveragingAllWells.toString(),
        isComparingTo1970Average: isComparingTo1970Average.toString(),
        comparisonYear,
      });

      wellIds.forEach((id) => params.append("well_ids", id.toString()));

      const response = await fetch(
        `${API_URL}/waterlevels/pdf?${params.toString()}`,
        { headers: { Authorization: authHeader() } },
      );

      if (!response.ok) throw new Error("PDF generation failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "waterlevels_report.pdf";
      a.click();
      window.URL.revokeObjectURL(url);
    },
  });

  const handleDownloadPDF = () => {
    if (!from || !to || !wellIds?.length) return;

    downloadPDFMutation.mutate({
      from,
      to,
      wellIds,
      isAveragingAllWells: avgAll,
      isComparingTo1970Average: cmp1970,
      comparisonYear: cmpYear ? cmpYear.toString() : "",
    });
  };

  // 1971 → current year
  const years = Array.from(
    { length: new Date().getFullYear() - 1971 + 1 },
    (_, i) => 1971 + i,
  );

  return (
    <BackgroundBox>
      <Card sx={{ height: "fit-content" }}>
        <CustomCardHeader title="Monitoring Wells Report" icon={MonitorHeart} />
        <CardContent>
          <Grid container justifyContent="space-between" alignContent="center">
            <Grid item>
              <Link to="/reports">
                <Tooltip title="Go back" placement="right">
                  <IconButton aria-label="return to reports page">
                    <ArrowBack />
                  </IconButton>
                </Tooltip>
              </Link>
            </Grid>
            <Grid item>
              <Tooltip title="Export report as PDF" placement="left">
                <IconButton
                  aria-label="export report as pdf"
                  onClick={handleDownloadPDF}
                  disabled={!wells?.length || downloadPDFMutation.isLoading}
                >
                  <PictureAsPdf />
                </IconButton>
              </Tooltip>
            </Grid>
          </Grid>
          <Grid
            container
            justifyContent="flex-start"
            alignContent="center"
            spacing={2}
            paddingTop={2}
            paddingBottom={2}
          >
            <Grid item xs={12} sm={6} md={3}>
              <ControlledDatepicker
                label="From"
                sx={{ width: "100%" }}
                control={control}
                size="small"
                name="from"
                views={["year", "month", "day"]}
                openTo="year"
                format="YYYY MMMM DD"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <ControlledDatepicker
                label="To"
                sx={{ width: "100%" }}
                control={control}
                size="small"
                name="to"
                views={["year", "month", "day"]}
                openTo="year"
                format="YYYY MMMM DD"
              />
            </Grid>
            <Grid item xs={12}>
              <ControlledAutocomplete
                name="wells"
                control={control}
                options={groupedWells}
                groupBy={(option: MonitoredWell & { group: string }) =>
                  option.group
                }
                getOptionLabel={(option: MonitoredWell) =>
                  option?.name ?? "Unnamed Well"
                }
                isOptionEqualToValue={(a: MonitoredWell, b: MonitoredWell) =>
                  a.id === b.id
                }
                disableClearable={false}
                multiple
                renderGroup={(params: any) => (
                  <li key={params.key} style={{ padding: 0, margin: 0 }}>
                    <ListSubheader
                      sx={{
                        position: "sticky",
                        top: 0,
                        zIndex: 1,
                        backgroundColor: theme.palette.background.paper,
                        color:
                          params.group === "Outside Recorder Wells"
                            ? theme.palette.secondary.main
                            : theme.palette.primary.main,
                        fontWeight: "bold",
                        textTransform: "uppercase",
                        fontSize: "0.85rem",
                        paddingY: "0.125rem",
                      }}
                    >
                      {params.group}
                    </ListSubheader>
                    <ul style={{ padding: 0, margin: 0 }}>{params.children}</ul>
                  </li>
                )}
                renderTags={(value: MonitoredWell[], getTagProps: any) =>
                  (value as (MonitoredWell & { group: string })[]).map(
                    (option, index) => {
                      const isOutside =
                        option.group === "Outside Recorder Wells";
                      return (
                        <Chip
                          label={option.name?.trim() || "Unnamed Well"}
                          {...getTagProps({ index })}
                          sx={{
                            backgroundColor: isOutside
                              ? theme.palette.secondary.main
                              : theme.palette.primary.main,
                            color: isOutside
                              ? theme.palette.secondary.contrastText
                              : theme.palette.primary.contrastText,
                            fontWeight: 500,
                          }}
                        />
                      );
                    },
                  )
                }
                renderOption={(
                  props: any,
                  option: MonitoredWell & { group: string },
                  { selected }: { selected: boolean },
                ) => {
                  const isOutside = option.group === "Outside Recorder Wells";
                  return (
                    <Box
                      component="li"
                      key={option.id}
                      {...props}
                      css={[
                        baseStyle,
                        selected ? selectedStyle(isOutside, theme) : undefined,
                        hoverStyle(isOutside, theme),
                      ]}
                    >
                      {option.name?.trim() || "Unnamed Well"}
                    </Box>
                  );
                }}
                renderInput={(params: any) => {
                  if (monitoredWellsQuery.isLoading)
                    params.inputProps.value = "Loading...";
                  return (
                    <TextField
                      {...params}
                      label="Wells"
                      size="small"
                      placeholder="Begin typing to search"
                    />
                  );
                }}
              />
            </Grid>
          </Grid>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <FormGroup>
                <Controller
                  name="isAveragingAllWells"
                  control={control}
                  render={({ field: { value, onChange } }) => (
                    <FormControlLabel
                      disabled={(wells?.length ?? 0) < 2}
                      control={
                        <Switch
                          checked={!!value}
                          onChange={(e) => {
                            const next = e.target.checked;

                            // Only prevent enabling when <2 wells.
                            if (next && (wells?.length ?? 0) < 2) return;

                            onChange(next);
                          }}
                        />
                      }
                      label="Average DTWs across all wells"
                    />
                  )}
                />
                <Controller
                  name="isComparingTo1970Average"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={<Switch {...field} checked={field.value} />}
                      label="Compare against the 1970 average"
                    />
                  )}
                />
              </FormGroup>
              <Box sx={{ pt: 2 }}>
                <Controller
                  name="comparisonYear"
                  control={control}
                  render={({ field, fieldState }) => (
                    <FormControl
                      fullWidth
                      size="small"
                      variant="outlined"
                      error={!!fieldState.error}
                    >
                      <InputLabel shrink>Compare against year</InputLabel>
                      <Select
                        label="Compare against year"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value)}
                        onBlur={field.onBlur}
                        inputRef={field.ref}
                        displayEmpty
                        MenuProps={{
                          PaperProps: {
                            style: { maxHeight: 48 * 6.5 + 8, width: 220 },
                          },
                        }}
                      >
                        <MenuItem disabled value="">
                          <em>Select a year</em>
                        </MenuItem>
                        {years.map((year) => (
                          <MenuItem key={year} value={year}>
                            {year}
                          </MenuItem>
                        ))}
                      </Select>
                      {fieldState.error && (
                        <FormHelperText>
                          {fieldState.error.message}
                        </FormHelperText>
                      )}
                    </FormControl>
                  )}
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={8}>
              <Box display="flex" flexDirection="column" alignItems="center">
                <Typography variant="h5" gutterBottom>
                  Depth of Water over Time
                </Typography>
                <Box sx={{ width: "100%", height: 550 }}>
                  {series.length === 0 ? (
                    <Box
                      sx={{
                        width: "100%",
                        height: 550,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "text.secondary",
                      }}
                    >
                      {wellIds.length === 0 ? (
                        <Typography>
                          Select at least one well to display data.
                        </Typography>
                      ) : (
                        <Typography>No data to display.</Typography>
                      )}
                    </Box>
                  ) : (
                    <LineChart
                      xAxis={[
                        {
                          data: allTimestamps,
                          scaleType: "time",
                          valueFormatter: (value) => {
                            const date = dayjs(value);
                            const isMidnight =
                              date.hour() === 0 && date.minute() === 0;
                            return isMidnight
                              ? date.format("MMM D, YYYY")
                              : date.format("MMM D, YYYY HH:mm");
                          },
                        },
                      ]}
                      yAxis={[{ reverse: true }]}
                      series={series}
                      slotProps={{
                        legend: {
                          direction: "horizontal",
                          position: {
                            vertical: "bottom",
                            horizontal: "center",
                          },
                        },
                      }}
                      sx={{ width: "100%", height: "100%" }}
                    />
                  )}
                </Box>
              </Box>
            </Grid>
          </Grid>
          <Grid item xs={12} py={1}>
            <DataGrid
              rows={tableRows ?? []}
              columns={columns}
              disableColumnMenu
              disableRowSelectionOnClick
              hideFooterSelectedRowCount
              pagination
              paginationModel={{
                page: search.m_page,
                pageSize: search.m_pageSize,
              }}
              pageSizeOptions={[5, 10, 25, 50]}
              onPaginationModelChange={(m) => {
                navigate({
                  to: "/reports/monitoringwells",
                  search: (prev) => ({
                    ...(prev as any),
                    m_pageSize: m.pageSize,
                    m_page:
                      m.pageSize !== (prev as any).m_pageSize ? 0 : m.page,
                  }),
                  replace: true,
                });
              }}
            />
          </Grid>
          <Grid item xs={12} py={1}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Report Averages ({bucketLabel})
            </Typography>

            <Typography variant="body2" sx={{ mt: 1 }}>
              All selected monitoring wells average:{" "}
              <strong>
                {allWellsLatest?.avg_value != null
                  ? `${allWellsLatest.avg_value.toFixed(2)} ft`
                  : "—"}
              </strong>
            </Typography>

            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              sx={{ mb: 1 }}
            >
              {from?.format("MMM D, YYYY")} → {to?.format("MMM D, YYYY")}
            </Typography>

            {reportAveragesQuery.isLoading && (
              <Typography variant="body2">Loading averages…</Typography>
            )}
            {reportAveragesQuery.isError && (
              <Typography variant="body2" color="error">
                Failed to load averages: {reportAveragesQuery.error.message}
              </Typography>
            )}

            {!reportAveragesQuery.isLoading && !reportAveragesQuery.isError && (
              <Box sx={{ mt: 1 }}>
                <DataGrid
                  rows={avgRows ?? []}
                  columns={avgColumns}
                  disableColumnMenu
                  disableRowSelectionOnClick
                  hideFooterSelectedRowCount
                  pagination
                  paginationModel={{
                    page: search.a_page,
                    pageSize: search.a_pageSize,
                  }}
                  pageSizeOptions={[5, 10, 25, 50]}
                  onPaginationModelChange={(m) => {
                    navigate({
                      to: "/reports/monitoringwells",
                      search: (prev) => ({
                        ...(prev as any),
                        a_pageSize: m.pageSize,
                        a_page:
                          m.pageSize !== (prev as any).a_pageSize ? 0 : m.page,
                      }),
                      replace: true,
                    });
                  }}
                />
              </Box>
            )}
          </Grid>
          <Grid item xs={12}>
            <Button
              onClick={() => {
                reset(hardResetFormValues, {
                  keepDirty: false,
                  keepTouched: false,
                });

                navigate({
                  to: "/reports/monitoringwells",
                  search: (prev) => ({
                    ...(prev as any),
                    ...hardResetSearch,
                  }),
                  replace: true,
                });
              }}
            >
              Reset
            </Button>
          </Grid>
        </CardContent>
      </Card>
    </BackgroundBox>
  );
};
