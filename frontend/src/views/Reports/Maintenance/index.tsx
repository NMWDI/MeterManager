import { useMemo } from "react";
import { ArrowBack, PictureAsPdf, Plumbing } from "@mui/icons-material";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
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
import dayjs, { Dayjs } from "dayjs";
import { CustomCardHeader } from "../../../components/CustomCardHeader";
import { BackgroundBox } from "../../../components/BackgroundBox";
import ControlledTextbox from "../../../components/RHControlled/ControlledTextbox";
import { useAuthHeader } from "react-auth-kit";
import { API_URL } from "../../../config";
import { PieChart } from "@mui/x-charts";
import { DataGrid, GridColDef } from "@mui/x-data-grid";

interface User {
  full_name: string;
  id: number;
}

const ALL_TECHNICIANS_ID = -1;

const allTechniciansOption: User = {
  id: ALL_TECHNICIANS_ID,
  full_name: "All Technicians",
};

const schema = yup.object().shape({
  from: yup.mixed<Dayjs>().nullable().required("From date is required"),
  to: yup
    .mixed<Dayjs>()
    .nullable()
    .required("To date is required")
    .test("is-after", "'To' date must be after 'From'", function (value) {
      const { from } = this.parent;
      return !from || !value || dayjs(value).isAfter(dayjs(from));
    }),
  techicians: yup
    .array()
    .of(
      yup.object({
        id: yup.number().required(),
        full_name: yup.string().required(),
      }),
    )
    .min(1, "At least one technician is required"),
  trss: yup.string().required("At least one Location is required"),
});

const defaultSchema = {
  from: dayjs(),
  to: dayjs(),
  techicians: [{ ...allTechniciansOption }],
  trss: "",
};

const size = {
  width: 400,
  height: 400,
};

export const MaintenanceReportView = () => {
  const authHeader = useAuthHeader();
  const techiciansQuery = useQuery({
    queryKey: ["Repairs", "report", "techicians"],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/users`, {
        headers: { Authorization: authHeader() },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }

      return response.json();
    },
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    cacheTime: 1000 * 60 * 60 * 24, // cache in memory for 24 hours
  });

  const { control, reset, setValue, watch } = useForm({
    resolver: yupResolver(schema),
    defaultValues: defaultSchema,
  });

  const from = watch("from");
  const to = watch("to");
  const technicians = watch("techicians");
  const trss = watch("trss");

  const technicianOptions = useMemo(() => {
    const base = techiciansQuery.data ?? [];
    return [...base, allTechniciansOption];
  }, [techiciansQuery.data]);

  const dataQuery = useQuery({
    queryKey: ["Inventory", "report", "maintenance", from, to, technicians],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      queryParams.set("from_month", from?.format("YYYY-MM"));
      queryParams.set("to_month", to?.format("YYYY-MM"));
      queryParams.set("trss", trss ?? "");

      technicians
        ?.map((t) => t.id)
        .forEach((id) => {
          queryParams.append("technicians", id.toString());
        });

      const response = await fetch(
        `${API_URL}/maintenance?${queryParams.toString()}`,
        {
          headers: { Authorization: authHeader() },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch maintenance data");
      }

      return response.json();
    },
    staleTime: 1000 * 60 * 60 * 24,
    cacheTime: 1000 * 60 * 60 * 24,
  });

  const numberOfRepairsPieChartData = useMemo(() => {
    return (
      dataQuery.data?.repairs_by_meter?.map((item: any) => ({
        label: item.meter,
        value: item.count,
      })) ?? []
    );
  }, [dataQuery.data]);

  const numberOfPMsPieChartData = useMemo(() => {
    return (
      dataQuery.data?.pms_by_meter?.map((item: any) => ({
        label: item.meter,
        value: item.count,
      })) ?? []
    );
  }, [dataQuery.data]);

  const tableRows = useMemo(() => {
    return (
      dataQuery.data?.table_rows?.map((row: any, index: number) => ({
        id: index,
        ...row,
      })) ?? []
    );
  }, [dataQuery.data]);

  const columns: GridColDef[] = [
    { field: "date_time", headerName: "Date / Time", flex: 1 },
    { field: "technician", headerName: "Technician", flex: 1 },
    {
      field: "number_of_repairs",
      headerName: "Number of Repairs",
      type: "number",
      flex: 1,
    },
    {
      field: "number_of_pms",
      headerName: "Number of Preventative Maintenances",
      type: "number",
      flex: 1,
    },
    {
      field: "meter",
      headerName: "Meter",
      flex: 1,
    },
  ];

  return (
    <BackgroundBox>
      <Card sx={{ height: "fit-content" }}>
        <CustomCardHeader title="Maintenance Report" icon={Plumbing} />
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
            padding={2}
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
              <ControlledTextbox
                sx={{ minWidth: "30rem" }}
                name="trss"
                label="TRSS"
                control={control}
                size="medium"
              />
            </Grid>
            <Grid item>
              <ControlledAutocomplete
                name="techicians"
                multiple
                options={technicianOptions}
                control={control}
                disableClearable={false}
                defaultValue={[]}
                getOptionLabel={(option: User) => option?.full_name ?? ""}
                isOptionEqualToValue={(option: User, value: User) =>
                  option?.id === value?.id
                }
                onChange={(_: React.SyntheticEvent, selected: User[]) => {
                  const isSelectingAll = selected.some(
                    (tech) => tech.id === ALL_TECHNICIANS_ID,
                  );
                  const allTechs = techiciansQuery.data ?? [];

                  if (isSelectingAll) {
                    // Set all real users as selected, excluding the synthetic "All Technicians"
                    setValue("techicians", allTechs);
                  } else {
                    setValue("techicians", selected);
                  }
                }}
                renderInput={(params: Parameters<typeof TextField>[0]) => {
                  if (techiciansQuery.isLoading && params.inputProps) {
                    params.inputProps.value = "Loading...";
                  }
                  return (
                    <TextField
                      {...params}
                      label="Technician(s)"
                      sx={{ minWidth: "15rem" }}
                      size="medium"
                      placeholder="Begin typing to search"
                    />
                  );
                }}
                renderTags={(selected: User[], getTagProps: any) =>
                  selected.map((option, index) => (
                    <Chip
                      key={option.id}
                      label={option.full_name}
                      {...getTagProps({ index })}
                    />
                  ))
                }
              />
            </Grid>
          </Grid>
          <Grid container>
            <Stack direction="row" width="100%" textAlign="center" spacing={2}>
              <Box flexGrow={1}>
                <Typography variant="h5">Number of Repairs</Typography>
                <PieChart
                  series={[
                    {
                      data: numberOfRepairsPieChartData,
                      innerRadius: 66.6,
                      paddingAngle: 1,
                      cornerRadius: 7.5,
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
              <Box flexGrow={1}>
                <Typography variant="h5">
                  Number of Preventative Maintenances
                </Typography>
                <PieChart
                  series={[
                    {
                      data: numberOfPMsPieChartData,
                      innerRadius: 66.6,
                      paddingAngle: 1,
                      cornerRadius: 7.5,
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
