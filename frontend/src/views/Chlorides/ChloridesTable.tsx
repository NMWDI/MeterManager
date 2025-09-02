import { useMemo } from "react";
import { Box, Button } from "@mui/material";
import { DataGrid, GridPagination, GridColDef } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import { RegionMeasurementDTO } from "../../interfaces";
import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

declare module "@mui/x-data-grid" {
  interface FooterPropsOverrides extends Partial<FooterExtraProps> { }
}

interface FooterExtraProps {
  onOpenModal: () => void;
  isRegionSelected: boolean;
}

export const ChloridesTable = ({
  rows,
  onOpenModal,
  isRegionSelected,
  onMeasurementSelect,
}: {
  rows: RegionMeasurementDTO[];
  onOpenModal: () => void;
  isRegionSelected: boolean;
  onMeasurementSelect: (data: {
    row: {
      id: number;
      timestamp: Dayjs;
      value: number;
      submitting_user: {
        id: number;
      };
      well: {
        id: number;
        ra_number: string;
      };
    };
  }) => void;
}) => {
  const columns: GridColDef[] = useMemo(
    () => [
      {
        field: "timestamp",
        headerName: "Date/Time",
        width: 200,
        valueGetter: (value) => dayjs.utc(value).tz("America/Denver"),
        valueFormatter: (value) =>
          dayjs.utc(value).tz("America/Denver").format("MM/DD/YYYY hh:mm A"),
        type: "dateTime",
      },
      { field: "value", headerName: "Chlorides (ppm)", width: 175 },
      {
        field: "submitting_user",
        headerName: "User",
        width: 200,
        valueGetter: (value: RegionMeasurementDTO["submitting_user"]) =>
          value.full_name,
      },
      {
        field: "well",
        headerName: "Well",
        width: 175,
        valueGetter: (value: RegionMeasurementDTO["well"]) => value.ra_number,
      },
    ],
    [],
  );

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
            isRegionSelected: isRegionSelected,
          },
        }}
        onRowClick={onMeasurementSelect}
      />
    </Box>
  );
};

const Footer = ({
  onOpenModal,
  isRegionSelected,
}: {
  onOpenModal?: () => void;
  isRegionSelected?: boolean;
}) => {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
      <Box sx={{ my: "auto" }}>
        {isRegionSelected ? (
          <Button
            variant="contained"
            size="small"
            onClick={onOpenModal}
            sx={{ flexShrink: 0, width: { xs: "100%", sm: "auto" }, ml: 1.5 }}
          >
            <AddIcon fontSize="small" sx={{ mr: 0.5 }} />
            Create
          </Button>
        ) : null}
      </Box>
      <GridPagination />
    </Box>
  );
};
