import { ArrowBack, PictureAsPdf, Plumbing } from "@mui/icons-material";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Grid,
  IconButton,
  TextField,
  Tooltip,
} from "@mui/material";
import { Link } from "react-router-dom";
import ControlledDatepicker from "../../../components/RHControlled/ControlledDatepicker";
import ControlledAutocomplete from "../../../components/RHControlled/ControlledAutocomplete";
import { useForm } from "react-hook-form";
import { useQuery } from "react-query";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import dayjs from "dayjs";

const schema = yup.object().shape({
  time: yup.mixed().nullable().required("Date is required"),
  techician: yup.string().required("Techician is required"),
  meters: yup.string().required("At least one Meter is required"),
  locations: yup.string().required("At least one Location is required"),
});

const defaultSchema = {
  time: dayjs(),
  techician: "",
  meters: "",
  locations: "",
};

export const RepairsReportView = () => {
  const techiciansQuery = useQuery({
    queryKey: ["Repairs", "report", "techicians"],
    queryFn: async () => {},
  });

  const metersQuery = useQuery({
    queryKey: ["Repairs", "report", "meters"],
    queryFn: async () => {},
  });

  const locationsQuery = useQuery({
    queryKey: ["Repairs", "report", "locations"],
    queryFn: async () => {},
  });

  const { control, reset } = useForm({
    resolver: yupResolver(schema),
    defaultValues: defaultSchema,
  });

  return (
    <Box
      sx={{
        height: "fit-content",
        width: "calc(100% - 16px)",
        m: 2,
        mt: 1,
        pb: 3,
      }}
    >
      <Card sx={{ height: "fit-content", width: "calc(100% - 16px)" }}>
        <CardHeader
          title={
            <div className="custom-card-header">
              <span>Repairs Report</span>
              <Plumbing />
            </div>
          }
          sx={{ mb: 0, pb: 0 }}
        />
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
                label="Year Month"
                sx={{ minWidth: "15rem" }}
                control={control}
                name="time"
                views={["year", "month"]}
                openTo="year"
                format="YYYY MMMM"
              />
            </Grid>
            <Grid item>
              <ControlledAutocomplete
                name="techician"
                options={techiciansQuery?.data ?? []}
                control={control}
                disableClearable={false}
                defaultValue={null}
                renderInput={(params: any) => {
                  if (techiciansQuery.isLoading)
                    params.inputProps.value = "Loading...";
                  return (
                    <TextField
                      {...params}
                      label="Technician"
                      sx={{ minWidth: "15rem" }}
                      size="small"
                      placeholder="Begin typing to search"
                    />
                  );
                }}
              />
            </Grid>
            <Grid item>
              <ControlledAutocomplete
                name="meters"
                options={metersQuery?.data ?? []}
                control={control}
                disableClearable={false}
                defaultValue={null}
                renderInput={(params: any) => {
                  if (metersQuery.isLoading)
                    params.inputProps.value = "Loading...";
                  return (
                    <TextField
                      {...params}
                      label="Meters"
                      sx={{ minWidth: "15rem" }}
                      size="small"
                      placeholder="Begin typing to search"
                    />
                  );
                }}
              />
            </Grid>
            <Grid item>
              <ControlledAutocomplete
                name="locations"
                options={locationsQuery?.data ?? []}
                control={control}
                disableClearable={false}
                defaultValue={null}
                renderInput={(params: any) => {
                  if (locationsQuery.isLoading)
                    params.inputProps.value = "Loading...";
                  return (
                    <TextField
                      {...params}
                      label="Locations"
                      sx={{ minWidth: "15rem" }}
                      size="small"
                      placeholder="Begin typing to search"
                    />
                  );
                }}
              />
            </Grid>
          </Grid>
          <Grid container></Grid>
          <Grid container>
            <Grid item>
              <Button onClick={() => reset()}>Reset</Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};
