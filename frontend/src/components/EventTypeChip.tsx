import { Chip } from "@mui/material";

export const EventTypeChip = ({
  event_type,
}: {
  event_type: "added" | "used" | "initial" | "current" | string;
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
        <Chip
          sx={{ fontFamily: "monospace" }}
          size="small"
          label="Work Order"
          color="error"
        />
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
