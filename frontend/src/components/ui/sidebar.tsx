import {
  Box,
  BoxProps,
  IconButton,
  alpha,
  SxProps,
  Theme,
  Tooltip,
  tooltipClasses,
  TooltipProps,
  styled,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { ChevronLeft, ChevronRight } from "@mui/icons-material";
import {
  MouseEvent as ReactMouseEvent,
  ReactNode,
  useEffect,
  useRef,
} from "react";

export const DESKTOP_MIN_WIDTH = 240;
export const DESKTOP_MAX_WIDTH = 420;
export const DESKTOP_COLLAPSED_WIDTH = 76;
export const DESKTOP_AUTO_COLLAPSE_WIDTH = 176;
export const TOPBAR_HEIGHT = {
  xs: "40px",
  sm: "44px",
};

const panelSurfaceSx: SxProps<Theme> = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  overflow: "hidden",
  borderRight: "1px solid",
  borderColor: "divider",
  background:
    "linear-gradient(180deg, rgba(248,250,252,0.98) 0%, rgba(255,255,255,0.96) 100%)",
  boxShadow: "0 20px 45px rgba(15, 23, 42, 0.08)",
  backdropFilter: "blur(12px)",
};

const ShadcnTooltipRoot = styled(({ className, ...props }: TooltipProps) => (
  <Tooltip {...props} classes={{ popper: className }} />
))(() => ({
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: "rgba(15, 23, 42, 0.96)",
    color: "#f8fafc",
    borderRadius: 10,
    padding: "8px 10px",
    fontSize: 12,
    fontWeight: 500,
    boxShadow: "0 12px 28px rgba(15, 23, 42, 0.25)",
  },
  [`& .${tooltipClasses.arrow}`]: {
    color: "rgba(15, 23, 42, 0.96)",
  },
}));

export function SidebarTooltip(props: TooltipProps) {
  return <ShadcnTooltipRoot arrow placement="right" {...props} />;
}

export function Sidebar({
  open,
  width,
  collapsedWidth = DESKTOP_COLLAPSED_WIDTH,
  onClose,
  onOpen,
  onWidthChange,
  children,
}: {
  open: boolean;
  width: number;
  collapsedWidth?: number;
  onClose: () => void;
  onOpen: () => void;
  onWidthChange: (width: number) => void;
  children: ReactNode;
}) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const resizeStateRef = useRef<{ startX: number; startWidth: number } | null>(
    null,
  );

  useEffect(() => {
    if (!isDesktop) {
      return undefined;
    }

    const handleMouseMove = (event: MouseEvent) => {
      if (!resizeStateRef.current) {
        return;
      }

      const nextWidth =
        resizeStateRef.current.startWidth +
        (event.clientX - resizeStateRef.current.startX);
      const isExpandingFromCollapsed = !open && nextWidth > collapsedWidth;

      if (isExpandingFromCollapsed) {
        onOpen();
        onWidthChange(
          Math.min(DESKTOP_MAX_WIDTH, Math.max(DESKTOP_MIN_WIDTH, nextWidth)),
        );
        return;
      }

      if (nextWidth <= DESKTOP_AUTO_COLLAPSE_WIDTH) {
        resizeStateRef.current = null;
        onClose();
        return;
      }

      onOpen();
      onWidthChange(
        Math.min(DESKTOP_MAX_WIDTH, Math.max(DESKTOP_MIN_WIDTH, nextWidth)),
      );
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
  }, [collapsedWidth, isDesktop, onClose, onOpen, onWidthChange, open]);

  const handleResizeStart = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    resizeStateRef.current = {
      startX: event.clientX,
      startWidth: open ? width : collapsedWidth,
    };
  };

  if (isDesktop) {
    const desktopWidth = open ? width : collapsedWidth;

    return (
      <Box
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          width: `${desktopWidth}px`,
          height: "100vh",
          zIndex: theme.zIndex.appBar + 1,
          transition: "width 180ms ease",
          overflow: "visible",
        }}
      >
        <Box
          sx={{
            ...panelSurfaceSx,
            width: "100%",
          }}
        >
          {children}
        </Box>
        <Box
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize sidebar"
          onMouseDown={handleResizeStart}
          sx={{
            position: "absolute",
            top: 0,
            right: -6,
            width: 12,
            height: "100%",
            cursor: "col-resize",
            zIndex: 1,
            "&::before": {
              content: '""',
              position: "absolute",
              top: 0,
              bottom: 0,
              left: "50%",
              width: 2,
              transform: "translateX(-50%)",
              borderRadius: 999,
              backgroundColor: "transparent",
              transition: "background-color 150ms ease",
            },
            "&:hover::before": {
              backgroundColor: alpha(theme.palette.primary.main, 0.28),
            },
          }}
        />
      </Box>
    );
  }

  return (
    <>
      <Box
        onClick={onClose}
        sx={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(15, 23, 42, 0.36)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 180ms ease",
          zIndex: theme.zIndex.appBar - 1,
        }}
      />
      <Box
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "min(88vw, 320px)",
          height: "100vh",
          transform: open ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 180ms ease",
          zIndex: theme.zIndex.appBar - 1,
          ...panelSurfaceSx,
        }}
      >
        {children}
      </Box>
    </>
  );
}

export function SidebarHeader({ children, sx, ...props }: BoxProps) {
  return (
    <Box
      {...props}
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 1,
        px: 2,
        py: 1.5,
        borderBottom: "1px solid",
        borderColor: "divider",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(248,250,252,0.92) 100%)",
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

export function SidebarHeaderCloseButton({
  onClick,
  direction = "left",
}: {
  onClick: () => void;
  direction?: "left" | "right";
}) {
  return (
    <IconButton
      aria-label="Close sidebar"
      onClick={onClick}
      size="small"
      sx={{
        color: "darkblue",
        border: "1px solid",
        borderColor: "divider",
        backgroundColor: "rgba(255,255,255,0.75)",
      }}
    >
      {direction === "left" ? (
        <ChevronLeft fontSize="small" />
      ) : (
        <ChevronRight fontSize="small" />
      )}
    </IconButton>
  );
}

export function SidebarContent({ children, sx, ...props }: BoxProps) {
  return (
    <Box
      {...props}
      sx={{
        flex: 1,
        overflowY: "auto",
        px: 1.5,
        py: 1.5,
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

export function SidebarGroup({ children, sx, ...props }: BoxProps) {
  return (
    <Box
      {...props}
      sx={{
        mb: 2,
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

export function SidebarGroupLabel({ children, sx, ...props }: BoxProps) {
  return (
    <Box
      {...props}
      sx={{
        px: 1,
        pb: 0.75,
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "text.secondary",
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

export function SidebarMenu({ children, sx, ...props }: BoxProps) {
  return (
    <Box
      {...props}
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 0.5,
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

export function SidebarMenuSub({ children, sx, ...props }: BoxProps) {
  return (
    <Box
      {...props}
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 0.5,
        mt: 0.5,
        ml: 1.5,
        pl: 1.5,
        borderLeft: "1px solid",
        borderColor: "divider",
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

export function SidebarInset({ children, sx, ...props }: BoxProps) {
  return (
    <Box
      {...props}
      sx={{
        minWidth: 0,
        flex: 1,
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}
