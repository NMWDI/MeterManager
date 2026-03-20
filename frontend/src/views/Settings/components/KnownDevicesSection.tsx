import { Alert, Box, Skeleton, Stack } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { KnownDeviceSummary } from "@/interfaces";
import {
  SessionDeviceIdentity,
  StatusChip,
  formatDateTime,
  getDeviceIcon,
} from "./SessionShared";

function KnownDeviceRow({ device }: { device: KnownDeviceSummary }) {
  const DeviceIcon = getDeviceIcon(device.device_type);

  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 2.5,
        border: "1px solid",
        borderColor: alpha("#13324b", 0.1),
        backgroundColor: device.is_current_device
          ? alpha("#0b5fa5", 0.08)
          : alpha("#ffffff", 0.72),
      }}
    >
      <Stack spacing={1.25}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
        >
          <SessionDeviceIdentity
            icon={DeviceIcon}
            title={device.device_label || "Unknown device"}
            subtitle={
              [device.browser, device.operating_system, device.device_type]
                .filter(Boolean)
                .join(" • ") || "No device details available"
            }
          />
          {device.is_current_device ? (
            <StatusChip
              color="primary"
              label="Current device"
              variant="filled"
            />
          ) : null}
        </Stack>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(8, minmax(0, 1fr))",
            gap: 1,
          }}
        >
          <Box sx={{ gridColumn: "1 / 2", gridRow: "1 / 2" }}>
            <Box sx={{ color: "text.secondary", fontSize: 12 }}>Sessions</Box>
            <Box sx={{ fontSize: 14 }}>{device.session_count}</Box>
          </Box>
          <Box sx={{ gridColumn: "2 / 3", gridRow: "1 / 2" }}>
            <Box sx={{ color: "text.secondary", fontSize: 12 }}>Active now</Box>
            <Box sx={{ fontSize: 14 }}>{device.active_session_count}</Box>
          </Box>
          <Box sx={{ gridColumn: "3 / 6", gridRow: "1 / 2" }}>
            <Box sx={{ color: "text.secondary", fontSize: 12 }}>First seen</Box>
            <Box sx={{ fontSize: 14 }}>
              {formatDateTime(device.signed_in_at_first)}
            </Box>
          </Box>
          <Box sx={{ gridColumn: "6 / 9", gridRow: "1 / 2" }}>
            <Box sx={{ color: "text.secondary", fontSize: 12 }}>Last seen</Box>
            <Box sx={{ fontSize: 14 }}>
              {formatDateTime(device.last_seen_at)}
            </Box>
          </Box>
        </Box>
      </Stack>
    </Box>
  );
}

export function KnownDevicesSection({
  isLoading,
  isError,
  knownDevices,
}: {
  isLoading: boolean;
  isError: boolean;
  knownDevices: KnownDeviceSummary[];
}) {
  return (
    <>
      {isLoading ? (
        <Stack spacing={1}>
          <Skeleton variant="rounded" height={112} />
          <Skeleton variant="rounded" height={112} />
        </Stack>
      ) : isError ? (
        <Alert severity="error">Unable to load known devices right now.</Alert>
      ) : knownDevices.length === 0 ? (
        <Alert severity="info">No known devices were found.</Alert>
      ) : (
        <Stack spacing={1}>
          {knownDevices.map((device) => (
            <KnownDeviceRow key={device.device_key} device={device} />
          ))}
        </Stack>
      )}
    </>
  );
}
