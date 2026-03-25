import { useMemo } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Tooltip,
  Typography,
} from "@mui/material";
import { DataGrid, GridPagination, GridColDef } from "@mui/x-data-grid";
import { Add } from "@mui/icons-material";
import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { useIsAuthenticated } from "react-auth-kit";
import { MonitoredWell, WellMeasurementDTO } from "@/interfaces";
import { useNavigate } from "@tanstack/react-router";
import { Route } from "@/routes/monitoringwells";

dayjs.extend(utc);
dayjs.extend(timezone);

declare module "@mui/x-data-grid" {
  interface FooterPropsOverrides {
    onOpenModal: () => void;
    isWellSelected: boolean;
    selectedWell?: MonitoredWell;
    isLoading: boolean;
  }
}

export const Table = ({
  rows,
  onOpenModal,
  isWellSelected,
  selectedWell,
  isLoading,
  onMeasurementSelect,
}: {
  rows: WellMeasurementDTO[];
  onOpenModal: () => void;
  isWellSelected: boolean;
  selectedWell?: MonitoredWell;
  isLoading: boolean;
  onMeasurementSelect: (data: {
    row: {
      id: number;
      timestamp: Dayjs;
      value: number;
      submitting_user: {
        id: number;
      };
    };
  }) => void;
}) => {
  const navigate = useNavigate();
  const { page, pageSize } = Route.useSearch();
  const isAuthenticated = useIsAuthenticated();
  const columns: GridColDef[] = useMemo(() => {
    const baseCols: GridColDef[] = [
      {
        field: "timestamp",
        headerName: "Date/Time",
        width: 175,
        valueGetter: (value) => dayjs.utc(value).tz("America/Denver"),
        valueFormatter: (value) =>
          dayjs.utc(value).tz("America/Denver").format("MM/DD/YYYY hh:mm A"),
        type: "dateTime",
      },
      {
        field: "value",
        headerName: "Depth to Water (ft)",
        flex: 1,
        minWidth: 100,
      },
    ];

    // Add user column only if logged in
    if (isAuthenticated()) {
      baseCols.push({
        field: "submitting_user",
        headerName: "User",
        width: 200,
        valueGetter: (value: WellMeasurementDTO["submitting_user"]) =>
          value.full_name,
      });
    }

    return baseCols;
  }, [isAuthenticated]);

  return (
    <Box sx={{ width: "100%", height: "100%", maxHeight: 600 }}>
      <DataGrid
        rows={rows}
        columns={columns}
        loading={isLoading}
        pagination
        initialState={{
          pagination: { paginationModel: { page: 0, pageSize: 25 } },
        }}
        pageSizeOptions={[10, 25, 50, 100]}
        paginationModel={{ page, pageSize }}
        onPaginationModelChange={(m) => {
          navigate({
            to: "/monitoringwells",
            search: (prev) => ({
              ...(prev as any),
              wellId: prev.wellId ?? undefined,
              page: m.page,
              pageSize: m.pageSize,
            }),
            replace: true,
          });
        }}
        slots={{
          footer: Footer,
          loadingOverlay: LoadingOverlay,
        }}
        slotProps={{
          footer: {
            onOpenModal: onOpenModal,
            isWellSelected: isWellSelected,
            selectedWell: selectedWell,
            isLoading: isLoading,
          },
        }}
        onRowClick={onMeasurementSelect}
      />
    </Box>
  );
};

const Footer = ({
  onOpenModal,
  isWellSelected,
  selectedWell,
  isLoading,
}: {
  onOpenModal: () => void;
  isWellSelected: boolean;
  selectedWell?: MonitoredWell;
  isLoading: boolean;
}) => {
  const isAuthenticated = useIsAuthenticated();
  const isPlugged = selectedWell?.well_status.status === "plugged";

  return (
    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
      <Box sx={{ my: "auto" }}>
        {isWellSelected && isAuthenticated() ? (
          <Tooltip
            title={
              isPlugged
                ? "This well is plugged and no longer accepting new measurements."
                : ""
            }
            placement="top"
            arrow
          >
            <span>
              <Button
                variant="contained"
                size="small"
                onClick={onOpenModal}
                disabled={isPlugged || isLoading}
                sx={{
                  flexShrink: 0,
                  width: { xs: "100%", sm: "auto" },
                  ml: 1.5,
                }}
                startIcon={<Add fontSize="small" />}
              >
                Create
              </Button>
            </span>
          </Tooltip>
        ) : null}
      </Box>
      <GridPagination />
    </Box>
  );
};

const LoadingOverlay = () => (
  <Box
    sx={{
      height: "100%",
      minHeight: 220,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 1.5,
      bgcolor: "rgba(255, 255, 255, 0.7)",
      pointerEvents: "none",
    }}
  >
    <CircularProgress size={36} thickness={4} />
    <Typography variant="body2" color="text.secondary">
      Loading table data...
    </Typography>
  </Box>
);
