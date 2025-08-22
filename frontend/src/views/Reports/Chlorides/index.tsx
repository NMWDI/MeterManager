import { ArrowBack, PictureAsPdf, Science } from "@mui/icons-material";
import { useMutation } from "react-query";
import dayjs, { Dayjs } from "dayjs";
import { useAuthHeader } from "react-auth-kit";
import {
  Button,
  Card,
  CardContent,
  Grid,
  IconButton,
  Tooltip,
} from "@mui/material";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { BackgroundBox } from "../../../components/BackgroundBox";
import { API_URL } from "../../../config";
import ControlledDatepicker from "../../../components/RHControlled/ControlledDatepicker";
import { CustomCardHeader } from "../../../components/CustomCardHeader";

const schema = yup.object().shape({
  from: yup.mixed().nullable().required("From date is required"),
  to: yup.mixed().nullable().required("To date is required"),
});

const defaultSchema = {
  from: dayjs(),
  to: dayjs(),
};

export const ChloridesReportView = () => {
  const { control, reset, watch } = useForm({
    resolver: yupResolver(schema),
    defaultValues: defaultSchema,
  });

  const from = watch("from");
  const to = watch("to");

  const authHeader = useAuthHeader();
  const downloadPDFMutation = useMutation({
    mutationFn: async ({
      from,
      to,
    }: {
      from: Dayjs;
      to: Dayjs;
    }) => {
      const params = new URLSearchParams({
        from_month: from.format("YYYY-MM"),
        to_month: to.format("YYYY-MM"),
      });

      const response = await fetch(
        `${API_URL}/chlorides/pdf?${params.toString()}`,
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
      a.download = "parts_used_report.pdf";
      a.click();
      window.URL.revokeObjectURL(url);
    },
  });

  const handleDownloadPDF = () => {
    if (!from || !to) return;

    downloadPDFMutation.mutate({
      from,
      to,
    });
  };

  return (
    <BackgroundBox>
      <Card sx={{ height: "fit-content" }}>
        <CustomCardHeader
          title="Chlorides Report"
          icon={Science}
        />
        <CardContent>
          <Grid
            container
            justifyContent="space-between"
            alignContent="center"
            paddingBottom={2}
          >
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
                  disabled={downloadPDFMutation.isLoading}
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
    </BackgroundBox>
  );
};
