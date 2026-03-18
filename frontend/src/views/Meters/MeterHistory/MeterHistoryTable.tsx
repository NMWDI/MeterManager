import { Card, CardContent } from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { useNavigate } from "@tanstack/react-router";
import { Route } from "@/routes/manage/meters";
import { History } from "@mui/icons-material";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(timezone);

import { MeterHistoryType } from "@/enums";
import { MeterHistoryDTO } from "@/interfaces";
import { CustomCardHeader } from "@/components";

export const MeterHistoryTable = ({
  onHistoryItemSelection,
  selectedMeterHistory,
  isLoading,
  selectedActivityId,
  selectedObservationId,
}: {
  onHistoryItemSelection: (item: MeterHistoryDTO) => void;
  selectedMeterHistory: MeterHistoryDTO[] | undefined;
  isLoading: boolean;
  selectedActivityId?: number;
  selectedObservationId?: number;
}) => {
  const search = Route.useSearch();
  const navigate = useNavigate();

  const columns: GridColDef[] = [
    {
      field: "date",
      headerName: "Date",
      valueGetter: (value) => {
        return dayjs.utc(value).tz("America/Denver");
      },
      valueFormatter: (value) => {
        return dayjs
          .utc(value)
          .tz("America/Denver")
          .format("MM/DD/YYYY hh:mm A");
      },
      width: 200,
    },
    {
      field: "history_type",
      headerName: "Activity Type",
      valueGetter: (value, row) => {
        if (row.history_type == MeterHistoryType.Activity) {
          return row.history_item.activity_type.name;
        } else return value;
      },
      width: 200,
    },
    {
      field: "well",
      headerName: "Well",
      valueGetter: (value, row) => {
        if (value === null) {
          return "";
        } else return row.well.ra_number;
      },
      width: 100,
    },
    {
      field: "history_item",
      headerName: "Water Users",
      valueGetter: (_, row) => {
        return row.history_item.water_users;
      },
      width: 200,
    },
  ];

  const rows = Array.isArray(selectedMeterHistory) ? selectedMeterHistory : [];

  // Stable row id (so selection works)
  const getRowId = (row: MeterHistoryDTO) => {
    if (row.history_type === MeterHistoryType.Activity) {
      return `act-${row.history_item.id}`;
    }
    return `obs-${row.history_item.id}`; // if observations have id; adjust if not
  };

  // Selection model derived from URL activity_id
  const rowSelectionModel =
    selectedActivityId !== undefined
      ? [`act-${selectedActivityId}`]
      : selectedObservationId !== undefined
        ? [`obs-${selectedObservationId}`]
        : [];

  return (
    <Card>
      <CustomCardHeader title="Meter History" icon={History} />
      <CardContent sx={{ height: "550px" }}>
        <DataGrid
          sx={{ height: "100%", border: "none" }}
          columns={columns}
          rows={rows}
          getRowId={getRowId}
          loading={isLoading}
          pagination
          paginationModel={{ page: search.h_page, pageSize: search.h_pageSize }}
          pageSizeOptions={[10, 25, 50, 100]}
          onPaginationModelChange={(m) => {
            navigate({
              to: "/manage/meters",
              search: (prev) => ({
                ...(prev as any),
                h_pageSize: m.pageSize,
                h_page: m.pageSize !== (prev as any).h_pageSize ? 0 : m.page,
              }),
              replace: true,
            });
          }}
          rowSelectionModel={rowSelectionModel}
          disableRowSelectionOnClick={false}
          onRowClick={(params) => {
            onHistoryItemSelection(params.row as MeterHistoryDTO);
          }}
        />
      </CardContent>
    </Card>
  );
};
