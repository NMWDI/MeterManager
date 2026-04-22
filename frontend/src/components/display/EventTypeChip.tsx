import { Box, Chip } from "@mui/material";

const METER_ACTIVITY_TYPE_LABELS: Record<string, string> = {
  Install: "Install",
  Uninstall: "Uninstall",
  "Preventative Maintenance": "PM",
  Repair: "Repair",
  "Rate Meter": "Rate Meter",
  Sell: "Sell",
  Scrap: "Scrap",
  "Location Only": "Location Only",
  "Change Water Users": "Water Users",
  "Re-install": "Re-install",
  "Uninstall and Hold": "Uninstall + Hold",
};

const getShortActivityLabel = (type?: string | null): string | null => {
  if (!type) return null;
  return METER_ACTIVITY_TYPE_LABELS[type] ?? type;
};

export const EventTypeChip = ({
  event_type,
  meter_activity_type,
}: {
  event_type: "added" | "used" | "workorder" | "initial" | "current" | string;
  meter_activity_type?: string | null;
}) => {
  switch (event_type) {
    case "added": {
      return (
        <Chip
          sx={{ fontFamily: "monospace" }}
          size="small"
          label="Parts Added"
          color="success"
        />
      );
    }
    case "used": {
      return (
        <Box
          sx={{
            width: "100%",
            height: "100%",
            display: "flex",
            justifyContent: "start",
            alignItems: "center",
            gap: 1,
          }}
        >
          <Chip
            sx={{ fontFamily: "monospace" }}
            size="small"
            label="Parts Used"
            color="error"
          />
          <Chip
            sx={{ fontFamily: "monospace" }}
            size="small"
            label={
              getShortActivityLabel(meter_activity_type) ?? "Manual Decrease"
            }
            color="default"
          />
        </Box>
      );
    }
    case "workorder": {
      return (
        <Box
          sx={{
            width: "100%",
            height: "100%",
            display: "flex",
            justifyContent: "start",
            alignItems: "center",
            gap: 1,
          }}
        >
          <Chip
            sx={{ fontFamily: "monospace" }}
            size="small"
            label="Work Order"
            color="warning"
          />
          {meter_activity_type && (
            <Chip
              sx={{ fontFamily: "monospace" }}
              size="small"
              label={getShortActivityLabel(meter_activity_type)}
              color="default"
            />
          )}
        </Box>
      );
    }
    case "initial": {
      return (
        <Chip
          sx={{ fontFamily: "monospace" }}
          size="small"
          label="Initial"
          color="info"
        />
      );
    }
    case "current": {
      return (
        <Chip
          sx={{ fontFamily: "monospace" }}
          size="small"
          label="Current"
          color="info"
        />
      );
    }
    default: {
      return (
        <Chip
          sx={{ fontFamily: "monospace" }}
          size="small"
          label={event_type}
          color="default"
        />
      );
    }
  }
};
