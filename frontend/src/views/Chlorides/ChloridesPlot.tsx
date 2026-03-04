import { useMemo } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import ReactPlot from "react-plotly.js";
import { Data } from "plotly.js";

export const Plot = ({
  manual_dates,
  manual_vals,
  isLoading,
}: {
  manual_dates: Date[];
  manual_vals: { value: number; well: string }[];
  isLoading: boolean;
}) => {
  const data: Partial<Data>[] = useMemo(() => {
    const wellData: Record<string, { x: Date[]; y: number[] }> = {};

    manual_vals.forEach((entry, idx) => {
      if (!wellData[entry.well]) {
        wellData[entry.well] = { x: [], y: [] };
      }
      wellData[entry.well].x.push(manual_dates[idx]);
      wellData[entry.well].y.push(entry.value);
    });

    return Object.entries(wellData).map(([well, { x, y }], index) => ({
      x,
      y,
      type: "scatter",
      mode: "markers",
      marker: { color: generateColorScale(index) },
      name: `Well ${well}`,
    }));
  }, [manual_dates, manual_vals]);

  return (
    <Box sx={{ height: { xs: 300, sm: 400, md: 500, lg: 600 }, width: "100%" }}>
      {isLoading ? (
        <Box
          sx={{
            height: { xs: 300, sm: 400, md: 500, lg: 600 },
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
        <ReactPlot
          data={data}
          layout={{
            autosize: true,
            title: "Chlorides Over Time",
            titlefont: { size: 18 },
            legend: {
              title: { text: "Wells", font: { size: 14 } },
              x: 1,
              y: 1,
              xanchor: "right",
              yanchor: "top",
              bordercolor: "grey", // Add border color
              borderwidth: 1, // Add border width
            },
            xaxis: { title: { text: "Date", font: { size: 16 } } },
            yaxis: {
              title: { text: "Chlorides (ppm)", font: { size: 16 } },
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

const generateColorScale = (n: number) => {
  const colors = [
    "#1f77b4",
    "#ff7f0e",
    "#2ca02c",
    "#d62728",
    "#9467bd",
    "#8c564b",
    "#e377c2",
    "#7f7f7f",
    "#bcbd22",
    "#17becf",
  ];
  return colors[n % colors.length];
};
