import {
  Avatar,
  Box,
  Chip,
  Typography,
  type SvgIconProps,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  LaptopMacRounded,
  PhoneIphoneRounded,
  TabletMacRounded,
} from "@mui/icons-material";
import type { ComponentType } from "react";

export function formatDateTime(value?: string | null) {
  if (!value) return "Not available";

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatRelativeTime(value?: string | null) {
  if (!value) return "Unknown";

  const timestamp = new Date(value).getTime();
  const diffMs = timestamp - Date.now();
  const absMinutes = Math.round(Math.abs(diffMs) / (1000 * 60));

  if (absMinutes < 1) return "Just now";
  if (absMinutes < 60) {
    return `${absMinutes} minute${absMinutes === 1 ? "" : "s"} ${
      diffMs >= 0 ? "from now" : "ago"
    }`;
  }

  const absHours = Math.round(absMinutes / 60);
  if (absHours < 24) {
    return `${absHours} hour${absHours === 1 ? "" : "s"} ${
      diffMs >= 0 ? "from now" : "ago"
    }`;
  }

  const absDays = Math.round(absHours / 24);
  return `${absDays} day${absDays === 1 ? "" : "s"} ${
    diffMs >= 0 ? "from now" : "ago"
  }`;
}

export function formatReasonLabel(value?: string | null) {
  if (!value) return "";
  return value.split("_").join(" ");
}

export function getDeviceIcon(
  deviceType?: string | null,
): ComponentType<SvgIconProps> {
  switch (deviceType) {
    case "Mobile":
      return PhoneIphoneRounded;
    case "Tablet":
      return TabletMacRounded;
    default:
      return LaptopMacRounded;
  }
}

export function SessionMetaItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <Box>
      <Typography variant="caption" sx={{ color: "text.secondary" }}>
        {label}
      </Typography>
      <Typography variant="body2">{value}</Typography>
    </Box>
  );
}

export function SessionDeviceIdentity({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: ComponentType<SvgIconProps>;
  title: string;
  subtitle: string;
}) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0 }}>
      <Avatar
        sx={{
          width: 34,
          height: 34,
          bgcolor: alpha("#13324b", 0.08),
          color: "#13324b",
        }}
      >
        <Icon fontSize="small" />
      </Avatar>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontWeight: 700 }} noWrap>
          {title}
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }} noWrap>
          {subtitle}
        </Typography>
      </Box>
    </Box>
  );
}

export function StatusChip({
  label,
  color,
  variant,
}: {
  label: string;
  color: "default" | "primary" | "success";
  variant?: "filled" | "outlined";
}) {
  return <Chip size="small" label={label} color={color} variant={variant} />;
}
