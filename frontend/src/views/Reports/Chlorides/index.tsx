import { ArrowBack, PictureAsPdf, Science } from "@mui/icons-material";
import { useMutation, useQuery } from "react-query";
import dayjs, { Dayjs } from "dayjs";
import { useAuthHeader } from "react-auth-kit";
import {
  Button,
  Card,
  CardContent,
  Grid,
  IconButton,
  Tooltip,
  Typography,
  Alert,
  Skeleton,
  Stack,
  Divider,
  Box,
} from "@mui/material";
import {
  MapContainer,
  LayersControl,
} from "react-leaflet";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { API_URL } from "../../../config";
import ControlledDatepicker from "../../../components/RHControlled/ControlledDatepicker";
import { CustomCardHeader, BackgroundBox, DirectionCard, SoutheastGuideLayer, SatelliteLayer, OpenStreetMapLayer } from "../../../components";
import { useFetchWithAuth } from "../../../hooks";

import "leaflet/dist/leaflet.css";
import "@changey/react-leaflet-markercluster/dist/styles.min.css";

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
});

const defaultSchema = {
  from: dayjs(),
  to: dayjs(),
};

interface iMinMaxAvg {
  min?: number;
  max?: number;
  avg?: number;
}

interface iChlorideReportNums {
  north: iMinMaxAvg;
  south: iMinMaxAvg;
  east: iMinMaxAvg;
  west: iMinMaxAvg;
}

export const ChloridesReportView = () => {
  const { control, reset, watch } = useForm({
    resolver: yupResolver(schema),
    defaultValues: defaultSchema,
  });

  const from = watch("from");
  const to = watch("to");

  const authHeader = useAuthHeader();
  const fetchWithAuth = useFetchWithAuth();

  const chloridesQuery = useQuery<iChlorideReportNums, Error>({
    queryKey: ["Chlorides", "Reports", from, to],
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        from_month: from?.format("YYYY-MM"),
        to_month: to?.format("YYYY-MM"),
      });

      return fetchWithAuth({
        method: "GET",
        route: `/chlorides/report?${searchParams.toString()}`,
      })
    },
    enabled: !!from && !!to,
  });

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
        `${API_URL}/chlorides/report/pdf?${params.toString()}`,
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
      a.download = "chlorides_report.pdf";
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
          </Grid>
          <Grid
            container
            columnSpacing={3}
            rowSpacing={3}
            sx={{ py: 3, px: 2 }}
          >
            <Grid item xs={12} md={6}>
              <Typography variant="h4" sx={{ textTransform: 'uppercase' }}>Chloride Reading:</Typography>
              {chloridesQuery.isLoading && (
                <Grid container spacing={2} sx={{ mt: 2 }}>
                  {[0, 1, 2, 3].map((i) => (
                    <Grid key={i} item xs={12}>
                      <Card variant="outlined" sx={{ height: 140, borderRadius: 3 }}>
                        <CardContent>
                          <Skeleton width="40%" />
                          <Divider sx={{ my: 1.5 }} />
                          <Stack direction="row" spacing={2} justifyContent="space-between">
                            <Skeleton width={60} height={36} />
                            <Skeleton width={60} height={36} />
                            <Skeleton width={60} height={36} />
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
              {chloridesQuery.isError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {chloridesQuery.error?.message || "Failed to load chloride readings."}
                </Alert>
              )}
              {!chloridesQuery.isLoading && !chloridesQuery.isError && (
                <Grid container spacing={2} sx={{ mt: 2 }}>
                  <Grid item xs={12}>
                    <DirectionCard
                      title="North"
                      min={chloridesQuery.data?.north?.min}
                      avg={chloridesQuery.data?.north?.avg}
                      max={chloridesQuery.data?.north?.max}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <DirectionCard
                      title="South"
                      min={chloridesQuery.data?.south?.min}
                      avg={chloridesQuery.data?.south?.avg}
                      max={chloridesQuery.data?.south?.max}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <DirectionCard
                      title="East"
                      min={chloridesQuery.data?.east?.min}
                      avg={chloridesQuery.data?.east?.avg}
                      max={chloridesQuery.data?.east?.max}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <DirectionCard
                      title="West"
                      min={chloridesQuery.data?.west?.min}
                      avg={chloridesQuery.data?.west?.avg}
                      max={chloridesQuery.data?.west?.max}
                    />
                  </Grid>
                </Grid>
              )}
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{
                height: { xs: 360, md: "100%" },
                minHeight: 360,
                borderRadius: 2,
                overflow: "hidden",
                "& .leaflet-container": { height: "100%", width: "100%" },
              }} >
                <MapContainer
                  center={[33, -104.0]}
                  zoom={8}
                  style={{ height: '100%', width: '100%' }}
                  maxZoom={18}
                >
                  <LayersControl position="topleft">
                    {/* Base Layers */}
                    <SatelliteLayer />
                    <OpenStreetMapLayer />
                    <SoutheastGuideLayer />
                  </LayersControl>
                </MapContainer>
              </Box>
            </Grid>
          </Grid>
          <Grid container>
            <Grid item>
              <Button onClick={() => reset()}>Reset</Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </BackgroundBox >
  );
};
