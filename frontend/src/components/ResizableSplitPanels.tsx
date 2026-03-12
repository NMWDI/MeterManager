import { ReactNode, useEffect, useRef, useState } from "react";
import { Box, useMediaQuery, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";

type ResizableSplitPanelsProps = {
  left: ReactNode;
  right: ReactNode;
  leftWidth?: number;
  defaultLeftWidth?: number;
  minLeftWidth?: number;
  minRightWidth?: number;
  desktopBreakpoint?: "sm" | "md" | "lg" | "xl";
  onLeftWidthChange?: (leftWidth: number) => void;
};

export const ResizableSplitPanels = ({
  left,
  right,
  leftWidth: controlledLeftWidth,
  defaultLeftWidth = 58,
  minLeftWidth = 35,
  minRightWidth = 28,
  desktopBreakpoint = "lg",
  onLeftWidthChange,
}: ResizableSplitPanelsProps) => {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up(desktopBreakpoint));
  const containerRef = useRef<HTMLDivElement | null>(null);
  const resizeStateRef = useRef<{
    startX: number;
    startLeftWidth: number;
    containerWidth: number;
  } | null>(null);
  const [uncontrolledLeftWidth, setUncontrolledLeftWidth] =
    useState(defaultLeftWidth);
  const leftWidth = controlledLeftWidth ?? uncontrolledLeftWidth;

  useEffect(() => {
    if (controlledLeftWidth === undefined) {
      return;
    }

    setUncontrolledLeftWidth(controlledLeftWidth);
  }, [controlledLeftWidth]);

  useEffect(() => {
    if (!isDesktop) {
      return undefined;
    }

    const handleMouseMove = (event: MouseEvent) => {
      if (!resizeStateRef.current) {
        return;
      }

      const { startX, startLeftWidth, containerWidth } = resizeStateRef.current;
      const dragDelta = event.clientX - startX;
      const dragPercent = (dragDelta / containerWidth) * 100;
      const maxLeftWidth = 100 - minRightWidth;
      const nextLeftWidth = Math.min(
        maxLeftWidth,
        Math.max(minLeftWidth, startLeftWidth + dragPercent),
      );

      setUncontrolledLeftWidth(nextLeftWidth);
      onLeftWidthChange?.(nextLeftWidth);
    };

    const handleMouseUp = () => {
      resizeStateRef.current = null;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDesktop, minLeftWidth, minRightWidth, onLeftWidthChange]);

  const handleResizeStart = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) {
      return;
    }

    event.preventDefault();
    resizeStateRef.current = {
      startX: event.clientX,
      startLeftWidth: leftWidth,
      containerWidth: containerRef.current.getBoundingClientRect().width,
    };
  };

  if (!isDesktop) {
    return (
      <Box sx={{ display: "grid", gap: 2, mt: "1rem" }}>
        <Box>{left}</Box>
        <Box>{right}</Box>
      </Box>
    );
  }

  return (
    <Box
      ref={containerRef}
      sx={{
        mt: "1rem",
        display: "flex",
        alignItems: "stretch",
        width: "100%",
        minWidth: 0,
      }}
    >
      <Box sx={{ width: `${leftWidth}%`, minWidth: 0, pr: 1 }}>
        {left}
      </Box>
      <Box
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize panels"
        onMouseDown={handleResizeStart}
        sx={{
          position: "relative",
          width: 16,
          mx: 0.5,
          flexShrink: 0,
          cursor: "col-resize",
          touchAction: "none",
          "&::before": {
            content: '""',
            position: "absolute",
            top: 0,
            bottom: 0,
            left: "50%",
            width: 2,
            transform: "translateX(-50%)",
            borderRadius: 999,
            backgroundColor: alpha(theme.palette.text.primary, 0.12),
            transition: "background-color 150ms ease, width 150ms ease",
          },
          "&:hover::before": {
            width: 4,
            backgroundColor: alpha(theme.palette.primary.main, 0.35),
          },
        }}
      />
      <Box sx={{ flex: 1, minWidth: 0, pl: 1 }}>
        {right}
      </Box>
    </Box>
  );
};
