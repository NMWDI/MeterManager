import { useMemo } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import Plot from "react-plotly.js";
import { Data } from "plotly.js";

export const MonitoringWellsPlot = ({
  manual_dates,
  manual_vals,
  logger_dates,
  logger_vals,
  sensor_dates,
  sensor_vals,
  isLoading,
}: {
  manual_dates: Date[];
  manual_vals: number[];
  logger_dates: Date[];
  logger_vals: number[];
  sensor_dates?: Date[];
  sensor_vals?: number[];
  isLoading: boolean;
}) => {
  const data: Partial<Data>[] = useMemo(
    () => [
      {
        x: manual_dates,
        y: manual_vals,
        type: "scatter",
        mode: "markers",
        marker: { color: "red" },
        name: "Manual",
      },
      {
        x: logger_dates,
        y: logger_vals,
        type: "scatter",
        marker: { color: "blue" },
        name: "Continuous",
      },
      {
        x: sensor_dates,
        y: sensor_vals,
        type: "scatter",
        mode: "markers",
        marker: { color: "purple" },
        name: "Woodpecker Sensor",
      },
    ],
    [
      manual_dates,
      manual_vals,
      logger_dates,
      logger_vals,
      sensor_dates,
      sensor_vals,
    ],
  );

  return (
    <Box sx={{ height: 600, width: "100%" }}>
      {isLoading ? (
        <Box
          sx={{
            height: 600,
            width: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "column",
          }}
        >
          <CircularProgress size={48} thickness={4} sx={{ mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            Loading plot data...
          </Typography>
        </Box>
      ) : (
        <Plot
          data={data}
          layout={{
            autosize: true,
            title: "Depth to Water Over Time",
            titlefont: { size: 18 },
            legend: {
              title: { text: "Datastreams", font: { size: 14 } },
              x: 1,
              y: 1,
              xanchor: "right",
              yanchor: "top",
              bordercolor: "grey", // Add border color
              borderwidth: 1, // Add border width
            },
            xaxis: { title: { text: "Date", font: { size: 16 } } },
            yaxis: {
              autorange: "reversed",
              title: { text: "Depth to Water (ft)", font: { size: 16 } },
            },
            margin: { t: 40, b: 50, l: 60, r: 10 },
          }}
          useResizeHandler
          style={{ width: "100%", height: "100%" }}
        />
      )}
    </Box>
  );
};
