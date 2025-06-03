import { ArrowBack, PictureAsPdf, Science } from "@mui/icons-material";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Grid,
  IconButton,
  Tooltip,
} from "@mui/material";
import { Link } from "react-router-dom";
import ControlledDatepicker from "../../../components/RHControlled/ControlledDatepicker";
import { useForm } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import dayjs from "dayjs";

const schema = yup.object().shape({
  from: yup.mixed().nullable().required("From date is required"),
  to: yup.mixed().nullable().required("To date is required"),
});

const defaultSchema = {
  from: dayjs(),
  to: dayjs(),
};

export const ChloridesReportView = () => {
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
              <span>Chlorides Report</span>
              <Science />
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
