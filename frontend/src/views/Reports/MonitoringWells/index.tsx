/** @jsxImportSource @emotion/react */
import { ArrowBack, PictureAsPdf, MonitorHeart } from "@mui/icons-material";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  IconButton,
  ListSubheader,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import { css } from "@emotion/react";
import { Link } from "react-router-dom";
import ControlledDatepicker from "../../../components/RHControlled/ControlledDatepicker";
import ControlledAutocomplete from "../../../components/RHControlled/ControlledAutocomplete";
import { useForm } from "react-hook-form";
import { useQuery } from "react-query";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import dayjs, { Dayjs } from "dayjs";
import { BackgroundBox } from "../../../components/BackgroundBox";
import { CustomCardHeader } from "../../../components/CustomCardHeader";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { LineChart } from "@mui/x-charts";
import { MonitoredWell, ST2Measurement, WellMeasurementDTO } from "../../../interfaces";
import { useFetchST2, useFetchWithAuth } from "../../../hooks";
import { separateAndSortMonitoredWells } from "../../../utils";
import { useMemo } from "react";


const schema = yup.object().shape({
  from: yup.mixed<Dayjs>().nullable().required("From date is required"),
  to: yup
    .mixed<Dayjs>()
    .nullable()
    .required("To date is required")
    .test("is-after", "'To' date must be after 'From'", function(value) {
      const { from } = this.parent;
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
      })
    )
    .min(1, "At least one Well is required"),
});

const defaultSchema = {
  from: dayjs(),
  to: dayjs(),
  wells: [],
};

const size = {
  width: 400,
  height: 400,
};

export const MonitoringWellsReportView = () => {
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

  const fetchWithAuth = useFetchWithAuth();
  const monitoredWellsQuery = useQuery<{ items: MonitoredWell[] }, Error, MonitoredWell[]>({
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

  const { control, reset, watch } = useForm({
    resolver: yupResolver(schema),
    defaultValues: defaultSchema,
  });

  const wells = watch("wells");
  const wellIds = useMemo(() => wells?.map(w => w.id) ?? [], [wells]);

  const from = watch("from");
  const to = watch("to");

  const manualMeasurementsQuery = useQuery<WellMeasurementDTO[], Error>({
    queryKey: ["manualMeasurements", wellIds, from, to],
    queryFn: () => {
      const searchParams = new URLSearchParams({
        from_month: from?.format("YYYY-MM"),
        to_month: to?.format("YYYY-MM"),
      });

      wellIds.forEach((id: number) => {
        searchParams.append("well_ids", id.toString());
      });

      return fetchWithAuth({
        method: "GET",
        route: `/waterlevels?${searchParams.toString()}`,
      })
    },
    enabled: wellIds.length > 0 && !!from && !!to,
  });

  // const dataStreamId = useMemo(
  //   () => (wellId ? getDataStreamId(wellId) : undefined),
  //   [wellId],
  // );

  // const fetchSt2 = useFetchST2();
  // const st2MeasurementsQuery = useQuery<ST2Measurement[], Error>({
  //   queryKey: ["st2Measurements", dataStreamId],
  //   queryFn: () =>
  //     fetchSt2("GET", `/Datastreams(${dataStreamId})/Observations`),
  //   enabled: !!dataStreamId,
  // });

  const columns: GridColDef[] = [
    { field: "date_time", headerName: "Date / Time", flex: 1 },
    {
      field: "depth_to_water",
      headerName: "Depth To Water (ft)",
      type: "number",
      flex: 1,
    },
    {
      field: "well",
      headerName: "Well",
      flex: 1,
    },
  ];
  const tableRows = manualMeasurementsQuery?.data?.map((manualMeasurement: WellMeasurementDTO) => ({
    id: manualMeasurement.id,
    date_time: manualMeasurement.timestamp,
    depth_to_water: manualMeasurement.value,
    well: manualMeasurement.well.ra_number,
  })) ?? [];

  const [outsideRecorderWells, regularWells] = separateAndSortMonitoredWells(monitoredWellsQuery?.data);
  const groupedWells = [
    ...regularWells.map(well => ({ ...well, group: "Wells" })),
    ...outsideRecorderWells.map(well => ({ ...well, group: "Outside Recorder Wells" })),
  ];

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
                <IconButton aria-label="export report as pdf">
                  <PictureAsPdf />
                </IconButton>
              </Tooltip>
            </Grid>
          </Grid>
          <Grid
            container
            justifyContent="flex-start"
            alignContent="center"
            gap={2}
            paddingTop={2}
            paddingBottom={2}
          >
            <Grid item>
              <ControlledDatepicker
                label="From"
                sx={{ minWidth: "15rem" }}
                control={control}
                size="medium"
                name="from"
                views={["year", "month"]}
                openTo="year"
                format="YYYY MMMM"
              />
            </Grid>
            <Grid item>
              <ControlledDatepicker
                label="To"
                sx={{ minWidth: "15rem" }}
                control={control}
                size="medium"
                name="to"
                views={["year", "month"]}
                openTo="year"
                format="YYYY MMMM"
              />
            </Grid>
            <Grid item>
              <ControlledAutocomplete
                name="wells"
                control={control}
                options={groupedWells}
                groupBy={(option: MonitoredWell & { group: string }) => option.group}
                getOptionLabel={(option: MonitoredWell) => option?.name ?? "Unnamed Well"}
                isOptionEqualToValue={(a: MonitoredWell, b: MonitoredWell) => a.id === b.id}
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
                  value.map((option: MonitoredWell & { group: string }, index: number) => {
                    const isOutside = option.group === "Outside Recorder Wells";
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
                  })
                }
                renderOption={(props: any, option: MonitoredWell & { group: string }, { selected }: { selected: boolean }) => {
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
                      sx={{ minWidth: "30rem" }}
                      label="Wells"
                      size="medium"
                      placeholder="Begin typing to search"
                    />
                  );
                }}
              />
            </Grid>
          </Grid>
          <Grid container>
            <Stack direction="row" width="100%" textAlign="center" spacing={2}>
              <Box flexGrow={1}>
                <Typography variant="h5">Depth of Water over time</Typography>
                <LineChart
                  series={[
                    {
                      data: [],
                    },
                  ]}
                  slotProps={{
                    legend: {
                      direction: "horizontal",
                      position: {
                        vertical: "bottom",
                        horizontal: "center",
                      },
                    },
                  }}
                  {...size}
                />
              </Box>
            </Stack>
          </Grid>
          <Grid container padding={2}>
            <DataGrid
              rows={tableRows ?? []}
              columns={columns}
              disableColumnMenu
              hideFooterSelectedRowCount
              pageSizeOptions={[5, 10, 25]}
              initialState={{
                pagination: {
                  paginationModel: { pageSize: 5, page: 0 },
                },
              }}
            />
          </Grid>
          <Grid container>
            <Grid item>
              <Button onClick={() => reset()}>Reset</Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </BackgroundBox>
  );
};
