import { ArrowBack, PictureAsPdf, MonitorHeart } from "@mui/icons-material";
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { Link } from "react-router-dom";
import ControlledDatepicker from "../../../components/RHControlled/ControlledDatepicker";
import ControlledAutocomplete from "../../../components/RHControlled/ControlledAutocomplete";
import { useForm } from "react-hook-form";
import { useQuery } from "react-query";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import dayjs from "dayjs";
import { BackgroundBox } from "../../../components/BackgroundBox";
import { CustomCardHeader } from "../../../components/CustomCardHeader";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { LineChart } from "@mui/x-charts";
import { MonitoredWell } from "../../../interfaces";
import { useFetchWithAuth } from "../../../hooks";
import { separateAndSortMonitoredWells } from "../../../utils";

const schema = yup.object().shape({
  from: yup.mixed().nullable().required("From date is required"),
  to: yup.mixed().nullable().required("To date is required"),
  wells: yup.string().required("At least one Well is required"),
});

const defaultSchema = {
  from: dayjs(),
  to: dayjs(),
  wells: "",
};

const size = {
  width: 400,
  height: 400,
};

export const MonitoringWellsReportView = () => {
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

  const { control, reset } = useForm({
    resolver: yupResolver(schema),
    defaultValues: defaultSchema,
  });

  const tableRows: any[] = []
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
              {monitoredWellsQuery?.isSuccess ?
                <ControlledAutocomplete
                  name="wells"
                  control={control}
                  options={groupedWells}
                  groupBy={(option: MonitoredWell & { group: string }) => option.group}
                  getOptionLabel={(option: MonitoredWell) => option?.name ?? "Unnamed Well"}
                  isOptionEqualToValue={(a: MonitoredWell, b: MonitoredWell) => a.id === b.id}
                  disableClearable={false}
                  multiple
                  renderOption={(props: any, option: MonitoredWell & { group: string }) => {
                    const isOutside = option.group === "Outside Recorder Wells";
                    return (
                      <li
                        {...props}
                        style={{
                          backgroundColor: isOutside ? "#f3e5f5" : "#e3f2fd", // light purple vs light blue
                          color: isOutside ? "#6a1b9a" : "#0d47a1", // dark purple vs dark blue
                          fontWeight: 500,
                        }}
                      >
                        {option.name?.trim() || "Unnamed Well"}
                      </li>
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
                /> : null}
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
