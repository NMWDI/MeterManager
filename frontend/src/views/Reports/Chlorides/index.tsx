import { useEffect } from "react";
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
  LayersControl,
  MapContainer,
  Marker,
  Tooltip as MapTooltip,
} from "react-leaflet";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import L from "leaflet";

import { API_URL } from "@/config";
import {
  ControlledDatepicker,
  CustomCardHeader,
  BackgroundBox,
  DirectionCard,
  SoutheastGuideLayer,
  SatelliteLayer,
  OpenStreetMapLayer,
  WellMapLegend,
} from "@/components";
import { RedMapIcon, BlackMapIcon } from "@/components/MapIcons";
import { useFetchWithAuth } from "@/hooks";
import { useGetWellLocations } from "@/service/ApiServiceNew";
import { Well } from "@/interfaces";
import { WellStatus } from "@/enums";

// @ts-ignore
import MarkerClusterGroup from "@changey/react-leaflet-markercluster";
import "leaflet/dist/leaflet.css";
import "@changey/react-leaflet-markercluster/dist/styles.min.css";

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
});

const defaultSchema = {
  from: dayjs().startOf("month"),
  to: dayjs().endOf("month"),
};

interface iMinMaxAvgMedCount {
  min?: number;
  max?: number;
  avg?: number;
  median?: number;
  count?: number;
}

interface iChlorideReportNums {
  north: iMinMaxAvgMedCount;
  south: iMinMaxAvgMedCount;
  east: iMinMaxAvgMedCount;
  west: iMinMaxAvgMedCount;
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
        from_date: from?.format("YYYY-MM-DD"),
        to_date: to?.format("YYYY-MM-DD"),
      });

      return fetchWithAuth({
        method: "GET",
        route: `/chlorides/report?${searchParams.toString()}`,
      });
    },
    enabled: !!from && !!to,
  });

  const downloadPDFMutation = useMutation({
    mutationFn: async ({ from, to }: { from: Dayjs; to: Dayjs }) => {
      const params = new URLSearchParams({
        from_date: from?.format("YYYY-MM-DD"),
        to_date: to?.format("YYYY-MM-DD"),
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

  const wellQuery = useGetWellLocations("", true);

  useEffect(() => {
    if (wellQuery.hasNextPage && !wellQuery.isFetchingNextPage) {
      wellQuery.fetchNextPage();
    }
  }, [wellQuery.hasNextPage, wellQuery.isFetchingNextPage]);

  const wellMarkers = wellQuery.data?.pages.flat() ?? [];

  return (
    <BackgroundBox>
      <Card sx={{ height: "fit-content" }}>
        <CustomCardHeader title="Chlorides Report" icon={Science} />
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
            spacing={2}
            paddingTop={2}
            paddingBottom={2}
          >
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
          </Grid>
          <Grid
            container
            columnSpacing={3}
            rowSpacing={3}
            sx={{ py: 3, px: 2 }}
          >
            <Grid item xs={12} md={6}>
              <Typography variant="h4" sx={{ textTransform: "uppercase" }}>
                Chlorides Reading:
              </Typography>
              {chloridesQuery.isLoading && (
                <Grid container spacing={2} sx={{ mt: 2 }}>
                  {[0, 1, 2, 3].map((i) => (
                    <Grid key={i} item xs={12}>
                      <Card
                        variant="outlined"
                        sx={{ height: 140, borderRadius: 3 }}
                      >
                        <CardContent>
                          <Skeleton width="40%" />
                          <Divider sx={{ my: 1.5 }} />
                          <Stack
                            direction="row"
                            spacing={2}
                            justifyContent="space-between"
                          >
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
                  {chloridesQuery.error?.message ||
                    "Failed to load chloride readings."}
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
                      median={chloridesQuery.data?.north?.median}
                      count={chloridesQuery.data?.north?.count}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <DirectionCard
                      title="South"
                      min={chloridesQuery.data?.south?.min}
                      avg={chloridesQuery.data?.south?.avg}
                      max={chloridesQuery.data?.south?.max}
                      median={chloridesQuery.data?.south?.median}
                      count={chloridesQuery.data?.south?.count}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <DirectionCard
                      title="East"
                      min={chloridesQuery.data?.east?.min}
                      avg={chloridesQuery.data?.east?.avg}
                      max={chloridesQuery.data?.east?.max}
                      median={chloridesQuery.data?.east?.median}
                      count={chloridesQuery.data?.east?.count}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <DirectionCard
                      title="West"
                      min={chloridesQuery.data?.west?.min}
                      avg={chloridesQuery.data?.west?.avg}
                      max={chloridesQuery.data?.west?.max}
                      median={chloridesQuery.data?.west?.median}
                      count={chloridesQuery.data?.west?.count}
                    />
                  </Grid>
                </Grid>
              )}
            </Grid>
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  height: { xs: 360, md: "100%" },
                  minHeight: 360,
                  borderRadius: 2,
                  overflow: "hidden",
                  "& .leaflet-container": { height: "100%", width: "100%" },
                }}
              >
                <MapContainer
                  center={[33, -104.0]}
                  zoom={8}
                  style={{ height: "100%", width: "100%" }}
                  maxZoom={18}
                >
                  <LayersControl position="topleft">
                    {/* Base Layers */}
                    <SatelliteLayer />
                    <OpenStreetMapLayer />
                    <SoutheastGuideLayer />

                    {/* Wells Cluster Overlay */}
                    <LayersControl.Overlay name="Wells" checked>
                      <MarkerClusterGroup
                        chunkedLoading
                        maxClusterRadius={35}
                        disableClusteringAtZoom={12}
                        iconCreateFunction={(cluster: any) => {
                          const count = cluster.getChildCount();
                          return L.divIcon({
                            html: `<div style="
                      background-color: rgba(0, 123, 255, 0.8);
                      color: white;
                      width: 40px;
                      height: 40px;
                      border-radius: 50%;
                      display: flex;
                      justify-content: center;
                      align-items: center;
                      font-weight: bold;
                      border: 2px solid white;
                    ">${count}</div>`,
                            className: "",
                            iconSize: [40, 40],
                          });
                        }}
                      >
                        {wellQuery.isSuccess &&
                          wellMarkers.map((well: Well) => (
                            <Marker
                              key={well.id}
                              position={[
                                well.location?.latitude,
                                well.location?.longitude,
                              ]}
                              icon={
                                well.well_status_id === WellStatus.PLUGGED
                                  ? BlackMapIcon
                                  : RedMapIcon
                              }
                            >
                              <MapTooltip>
                                {well.name || well.ra_number || well.id}
                              </MapTooltip>
                            </Marker>
                          ))}
                      </MarkerClusterGroup>
                    </LayersControl.Overlay>
                  </LayersControl>
                  <WellMapLegend />
                </MapContainer>
              </Box>
              {/* Loading first page */}
              {wellQuery.isLoading && (
                <Box py={2}>
                  <Typography
                    variant="h6"
                    sx={{
                      pointerEvents: "none",
                      userSelect: "none",
                    }}
                  >
                    Loading well markers...
                  </Typography>
                </Box>
              )}
              {/* Loading additional pages */}
              {wellQuery.isFetchingNextPage && (
                <Box py={2}>
                  <Typography
                    variant="h6"
                    sx={{
                      pointerEvents: "none",
                      userSelect: "none",
                    }}
                  >
                    Loading more wells...
                  </Typography>
                </Box>
              )}
              {wellQuery.isSuccess && wellMarkers.length === 0 && (
                <Box py={2}>
                  <Typography
                    variant="h6"
                    color="text.secondary"
                    sx={{
                      pointerEvents: "none",
                      userSelect: "none",
                    }}
                  >
                    No wells found for that search.
                  </Typography>
                </Box>
              )}
              {/* Error */}
              {wellQuery.isError && (
                <Box py={2}>
                  <Typography
                    variant="h6"
                    color="error"
                    sx={{
                      pointerEvents: "none",
                      userSelect: "none",
                    }}
                  >
                    Failed to load wells: {wellQuery.error.message}
                  </Typography>
                </Box>
              )}
            </Grid>
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
