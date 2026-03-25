import {
  Alert,
  Box,
  Button,
  FormControlLabel,
  Skeleton,
  Stack,
  Switch,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Check, DeleteOutline } from "@mui/icons-material";
import { UserSessionSummary } from "@/interfaces";
import {
  SessionDeviceIdentity,
  SessionMetaItem,
  StatusChip,
  formatDateTime,
  formatReasonLabel,
  formatRelativeTime,
  getDeviceIcon,
} from "./SessionShared";

function SessionRow({
  session,
  onCloseSession,
  isClosing,
}: {
  session: UserSessionSummary;
  onCloseSession: (sessionIdentifier: string) => void;
  isClosing: boolean;
}) {
  const DeviceIcon = getDeviceIcon(session.device_type);

  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 2.5,
        border: "1px solid",
        borderColor: alpha("#13324b", 0.1),
        backgroundColor: session.is_current
          ? alpha("#0b5fa5", 0.08)
          : alpha("#ffffff", 0.74),
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
            title={session.device_label || "Unknown device"}
            subtitle={
              [session.browser, session.operating_system, session.ip_address]
                .filter(Boolean)
                .join(" • ") || "No device details available"
            }
          />
          <Stack direction="row" spacing={0.75} flexWrap="wrap">
            {session.is_current ? (
              <StatusChip label="Current" color="primary" />
            ) : null}
            <StatusChip
              label={session.is_active ? "Active" : "Closed"}
              color={session.is_active ? "success" : "default"}
              variant={session.is_active ? "filled" : "outlined"}
            />
          </Stack>
        </Stack>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "repeat(3, minmax(0, 1fr))",
            },
            gap: 1,
          }}
        >
          <SessionMetaItem
            label="Signed in"
            value={
              <Typography component="span">
                {formatDateTime(session.signed_in_at)}
              </Typography>
            }
          />

          <SessionMetaItem
            label="Last seen"
            value={
              <Tooltip
                title={formatRelativeTime(session.last_seen_at)}
                arrow
                placement="bottom"
              >
                <Typography
                  component="span"
                  sx={{ display: "inline-block", cursor: "help" }}
                >
                  {formatDateTime(session.last_seen_at)}
                </Typography>
              </Tooltip>
            }
          />

          <SessionMetaItem
            label="Sign-out status"
            value={
              session.signed_out_at ? (
                <Typography component="span">
                  {session.sign_out_reason_name
                    ? formatReasonLabel(session.sign_out_reason_name)
                    : "Signed out"}
                </Typography>
              ) : (
                "Still Active"
              )
            }
          />
        </Box>

        <Box>
          <Button
            variant={session.is_current ? "contained" : "outlined"}
            color={session.is_current ? "primary" : "error"}
            size="small"
            disabled={session.is_current || !session.is_active || isClosing}
            onClick={() => onCloseSession(session.session_identifier)}
            startIcon={session.is_current ? <Check /> : <DeleteOutline />}
          >
            {session.is_current ? "This device" : "Close session"}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}

export function SessionHistorySection({
  isLoading,
  isError,
  activeSessions,
  closedSessions,
  showClosedSessions,
  onShowClosedSessionsChange,
  closeSession,
  closingSessionIdentifier,
}: {
  isLoading: boolean;
  isError: boolean;
  activeSessions: UserSessionSummary[];
  closedSessions: UserSessionSummary[];
  showClosedSessions: boolean;
  onShowClosedSessionsChange: (nextValue: boolean) => void;
  closeSession: (sessionIdentifier: string) => void;
  closingSessionIdentifier?: string;
}) {
  const visibleSessions = showClosedSessions
    ? [...activeSessions, ...closedSessions]
    : activeSessions;

  return (
    <Stack spacing={1.5}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.25}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Session activity
        </Typography>

        <FormControlLabel
          sx={{ mr: 0 }}
          control={
            <Switch
              size="small"
              checked={showClosedSessions}
              onChange={(_, checked) => onShowClosedSessionsChange(checked)}
            />
          }
          label={`Show Closed Session${(closedSessions?.length ?? 0) > 1 ? "s" : ""}`}
        />
      </Stack>
      {isLoading ? (
        <Stack spacing={1}>
          <Skeleton variant="rounded" height={165} sx={{ borderRadius: 2.5 }} />
          <Skeleton variant="rounded" height={165} sx={{ borderRadius: 2.5 }} />
        </Stack>
      ) : isError ? (
        <Alert severity="error">
          Unable to load session history right now.
        </Alert>
      ) : visibleSessions.length === 0 ? (
        <Alert severity="info">
          {showClosedSessions
            ? "No recorded sessions were found."
            : "No active sessions were found."}
        </Alert>
      ) : (
        <Stack spacing={1}>
          {visibleSessions.map((session) => (
            <SessionRow
              key={session.session_identifier}
              session={session}
              isClosing={
                closingSessionIdentifier === session.session_identifier
              }
              onCloseSession={closeSession}
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
