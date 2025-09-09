import { useMemo } from "react";
import { Box, Button, Tooltip } from "@mui/material";
import { DataGrid, GridPagination, GridColDef } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import { MonitoredWell, WellMeasurementDTO } from "../../interfaces";
import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { useIsAuthenticated } from "react-auth-kit";

dayjs.extend(utc);
dayjs.extend(timezone);

declare module "@mui/x-data-grid" {
  interface FooterPropsOverrides {
    onOpenModal: () => void;
    isWellSelected: boolean;
    selectedWell?: MonitoredWell;
  }
}

export const MonitoringWellsTable = ({
  rows,
  onOpenModal,
  isWellSelected,
  selectedWell,
  onMeasurementSelect,
}: {
  rows: WellMeasurementDTO[];
  onOpenModal: () => void;
  isWellSelected: boolean;
  selectedWell?: MonitoredWell;
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
      { field: "value", headerName: "Depth to Water (ft)", flex: 1, minWidth: 100 },
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
        slots={{
          footer: Footer,
        }}
        slotProps={{
          footer: {
            onOpenModal: onOpenModal,
            isWellSelected: isWellSelected,
            selectedWell: selectedWell,
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
}: {
  onOpenModal: () => void;
  isWellSelected: boolean;
  selectedWell?: MonitoredWell;
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
                disabled={isPlugged}
                sx={{ flexShrink: 0, width: { xs: "100%", sm: "auto" }, ml: 1.5 }}
              >
                <AddIcon fontSize="small" sx={{ mr: 0.5 }} />
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
