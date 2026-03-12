import { useEffect, useMemo, useRef, useState } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import ReactPlot from "react-plotly.js";
import type { Data } from "plotly.js";
import { PlotContextMenu } from "../../components/PlotContextMenu";

export const Plot = ({
  manual_dates,
  manual_vals,
  isLoading,
}: {
  manual_dates: Date[];
  manual_vals: { value: number; well: string }[];
  isLoading: boolean;
}) => {
  const plotContainerRef = useRef<HTMLDivElement | null>(null);
  const plotRef = useRef<HTMLElement | null>(null);
  const [plotRevision, setPlotRevision] = useState(0);

  const resetAxes = () => {
    if (!plotRef.current) {
      return;
    }

    const resetAxesButton = plotRef.current.querySelector<HTMLElement>(
      '.modebar-btn[data-title="Reset axes"]',
    );

    if (resetAxesButton) {
      resetAxesButton.click();
    }
  };

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
      type: "scattergl",
      mode: "markers",
      marker: { color: generateColorScale(index) },
      name: `Well ${well}`,
    }));
  }, [manual_dates, manual_vals]);

  const hasData = data.length > 0;

  useEffect(() => {
    const container = plotContainerRef.current;
    if (!container) {
      return undefined;
    }

    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setPlotRevision((prev) => prev + 1);
      });
    });

    observer.observe(container);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return (
    <Box
      sx={{
        height: { xs: 300, sm: 400, md: 500, lg: 600 },
        width: "100%",
        border: 1,
        borderColor: "divider",
        borderRadius: 1,
        bgcolor: "background.paper",
        overflow: "hidden",
        p: 2,
        boxSizing: "border-box",
      }}
    >
      {isLoading && !hasData ? (
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
        <PlotContextMenu
          onResetAxes={resetAxes}
        >
          <Box
            ref={plotContainerRef}
            sx={{ width: "100%", height: "100%" }}
          >
            <ReactPlot
              data={data}
              revision={plotRevision}
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
                  bordercolor: "grey",
                  borderwidth: 1,
                },
                xaxis: { title: { text: "Date", font: { size: 16 } } },
                yaxis: {
                  title: { text: "Chlorides (ppm)", font: { size: 16 } },
                },
                margin: { t: 40, b: 50, l: 60, r: 10 },
              }}
              onInitialized={(_, graphDiv) => {
                plotRef.current = graphDiv;
              }}
              onUpdate={(_, graphDiv) => {
                plotRef.current = graphDiv;
              }}
              config={{
                displaylogo: false,
                responsive: true,
                modeBarButtonsToRemove: [
                  "select2d",
                  "lasso2d",
                  "autoScale2d",
                ],
              }}
              useResizeHandler
              style={{ width: "100%", height: "100%" }}
            />
          </Box>
        </PlotContextMenu>
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
