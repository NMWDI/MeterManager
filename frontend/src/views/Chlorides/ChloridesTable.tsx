import { useMemo } from "react";
import { Box, Button } from "@mui/material";
import { DataGrid, GridPagination, GridColDef } from "@mui/x-data-grid";
import { Add } from "@mui/icons-material";
import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { useIsAuthenticated } from "react-auth-kit";
import { RegionMeasurementDTO } from "@/interfaces";
import { useNavigate } from "@tanstack/react-router";
import { Route } from "@/routes/chlorides";

dayjs.extend(utc);
dayjs.extend(timezone);

declare module "@mui/x-data-grid" {
  interface FooterPropsOverrides extends Partial<FooterExtraProps> {}
}

interface FooterExtraProps {
  onOpenModal: () => void;
  isRegionSelected: boolean;
}

export const Table = ({
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
  const navigate = useNavigate();
  const { page, pageSize } = Route.useSearch();

  const isAuthenticated = useIsAuthenticated();
  const columns: GridColDef[] = useMemo(() => {
    const baseCols: GridColDef[] = [
      {
        field: "timestamp",
        headerName: "Date/Time",
        width: 200,
        valueGetter: (value) => dayjs.utc(value).tz("America/Denver"),
        valueFormatter: (value) =>
          dayjs.utc(value).tz("America/Denver").format("MM/DD/YYYY hh:mm A"),
        type: "dateTime",
      },
      {
        field: "value",
        headerName: "Chlorides (ppm)",
        width: 175,
        valueFormatter: (value) => (value == null ? "NOT SAMPLED" : value),
      },
      {
        field: "well",
        headerName: "Well",
        width: 175,
        valueGetter: (value: RegionMeasurementDTO["well"]) => value.ra_number,
      },
    ];

    // Add user column only if logged in
    if (isAuthenticated()) {
      baseCols.push({
        field: "submitting_user",
        headerName: "User",
        width: 200,
        valueGetter: (value: RegionMeasurementDTO["submitting_user"]) =>
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
        pagination
        initialState={{
          pagination: { paginationModel: { page: 0, pageSize: 25 } },
        }}
        pageSizeOptions={[10, 25, 50, 100]}
        paginationModel={{ page, pageSize }}
        onPaginationModelChange={(m) => {
          navigate({
            to: "/chlorides",
            search: (prev) => ({
              regionId: prev.regionId ?? undefined,
              page: m.page,
              pageSize: m.pageSize,
            }),
            replace: true,
          });
        }}
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
  const isAuthenticated = useIsAuthenticated();
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
      <Box sx={{ my: "auto" }}>
        {isRegionSelected && isAuthenticated() ? (
          <Button
            variant="contained"
            size="small"
            onClick={onOpenModal}
            sx={{ flexShrink: 0, width: { xs: "100%", sm: "auto" }, ml: 1.5 }}
            startIcon={<Add fontSize="small" />}
          >
            Create
          </Button>
        ) : null}
      </Box>
      <GridPagination />
    </Box>
  );
};
