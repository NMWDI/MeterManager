import { Card, CardContent } from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import HistoryIcon from "@mui/icons-material/History";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(timezone);

import { MeterHistoryType } from "../../../enums";
import { MeterHistoryDTO } from "../../../interfaces";
import { CustomCardHeader } from "../../../components/CustomCardHeader";

export const MeterHistoryTable = ({
  onHistoryItemSelection,
  selectedMeterHistory,
}: {
  onHistoryItemSelection: Function;
  selectedMeterHistory: MeterHistoryDTO[] | undefined;
}) => {
  const handleRowSelect = (rowDetails: any) => {
    onHistoryItemSelection(rowDetails.row);
  };

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

  return (
    <Card sx={{ height: "100%" }}>
      <CustomCardHeader title="Meter History" icon={HistoryIcon} />
      <CardContent sx={{ height: "550px" }}>
        <DataGrid
          sx={{ height: "100%", border: "none" }}
          columns={columns}
          rows={Array.isArray(selectedMeterHistory) ? selectedMeterHistory : []}
          onRowClick={handleRowSelect}
        />
      </CardContent>
    </Card>
  );
};
