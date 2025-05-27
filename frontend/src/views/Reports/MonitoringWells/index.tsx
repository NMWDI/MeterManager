import { ArrowBack, PictureAsPdf, MonitorHeart } from "@mui/icons-material";
import {
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
import { BackgroundBox } from "../../../components/BackgroundBox";

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

export const MonitoringWellsReportView = () => {
  const wellsQuery = useQuery({
    queryKey: ["MonitoringWells", "report", "wells"],
    queryFn: async () => {},
  });

  const { control, reset } = useForm({
    resolver: yupResolver(schema),
    defaultValues: defaultSchema,
  });

  return (
    <BackgroundBox>
      <Card sx={{ height: "fit-content" }}>
        <CardHeader
          title={
            <div className="custom-card-header">
              <span>Monitoring Wells Report</span>
              <MonitorHeart />
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
                label="From"
                sx={{ minWidth: "15rem" }}
                control={control}
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
                name="to"
                views={["year", "month"]}
                openTo="year"
                format="YYYY MMMM"
              />
            </Grid>
            <Grid item>
              <ControlledAutocomplete
                name="wells"
                options={wellsQuery?.data ?? []}
                control={control}
                disableClearable={false}
                defaultValue={null}
                renderInput={(params: any) => {
                  if (wellsQuery.isLoading)
                    params.inputProps.value = "Loading...";
                  return (
                    <TextField
                      {...params}
                      sx={{ minWidth: "15rem" }}
                      label="Wells"
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
    </BackgroundBox>
  );
};
