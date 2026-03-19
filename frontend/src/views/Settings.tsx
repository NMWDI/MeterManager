import { useEffect, useMemo, useState } from "react";
import * as yup from "yup";
import { enqueueSnackbar } from "notistack";
import { yupResolver } from "@hookform/resolvers/yup";
import { Controller, useForm } from "react-hook-form";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  ListItemIcon,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  Check,
  CheckCircleOutline,
  DeleteOutline,
  DevicesRounded,
  Edit,
  HistoryRounded,
  LaptopMacRounded,
  PhoneIphoneRounded,
  Settings as SettingsIcon,
  SettingsApplications,
  ShieldOutlined,
  TabletMacRounded,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";
import { useAuthUser, useSignIn } from "react-auth-kit";
import { useMutation, useQuery, useQueryClient } from "react-query";
import {
  BackgroundBox,
  CustomCardHeader,
  ImageUploadWithPreview,
  IsTrueChip,
  RoleChip,
} from "@/components";
import { navConfig } from "@/constants";
import { useFetchWithAuth } from "@/hooks";
import {
  KnownDeviceSummary,
  SecurityScope,
  UserSessionSummary,
  UserSessionsResponse,
} from "@/interfaces";
import { clearSavedQueryLocalStorage } from "@/service";
import { getTrackedSession } from "@/utils/SessionTracking";

const redirectSchema = yup.object().shape({
  redirect_page: yup.string().required("Please select a redirect page"),
});

const passwordSchema = yup.object().shape({
  currentPassword: yup.string().required("Current password is required"),
  newPassword: yup
    .string()
    .min(8, "New password must be at least 8 characters")
    .required("New password is required"),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref("newPassword")], "Passwords must match")
    .required("Please confirm new password"),
});

function formatDateTime(value?: string | null) {
  if (!value) return "Not available";

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatRelativeTime(value?: string | null) {
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

function formatReasonLabel(value?: string | null) {
  if (!value) return "";
  return value.split("_").join(" ");
}

function getDeviceIcon(deviceType?: string | null) {
  switch (deviceType) {
    case "Mobile":
      return PhoneIphoneRounded;
    case "Tablet":
      return TabletMacRounded;
    default:
      return LaptopMacRounded;
  }
}

function InfoTile({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <Box
      sx={{
        p: compact ? 1.5 : 2,
        borderRadius: 3,
        border: "1px solid",
        borderColor: alpha("#13324b", 0.1),
        backgroundColor: alpha("#ffffff", 0.72),
        minHeight: compact ? 72 : 92,
      }}
    >
      <Typography
        variant="body2"
        sx={{ color: "text.secondary", mb: 1, fontWeight: 600 }}
      >
        {label}
      </Typography>
      {value}
    </Box>
  );
}

function SectionCard({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: typeof ShieldOutlined;
  children: React.ReactNode;
}) {
  return (
    <Card
      sx={{
        borderRadius: 4,
        border: "1px solid",
        borderColor: alpha("#13324b", 0.12),
        boxShadow: "0 18px 45px rgba(12, 32, 53, 0.08)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(245,249,252,0.98) 100%)",
      }}
    >
      <CardContent sx={{ p: { xs: 2.25, md: 3 } }}>
        <Stack spacing={2.5}>
          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <Avatar
              sx={{
                bgcolor: alpha("#0b5fa5", 0.12),
                color: "#0b5fa5",
                width: 44,
                height: 44,
              }}
            >
              <Icon />
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {title}
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {description}
              </Typography>
            </Box>
          </Stack>
          {children}
        </Stack>
      </CardContent>
    </Card>
  );
}

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
  const statusColor = session.is_active ? "success" : "default";

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 3,
        border: "1px solid",
        borderColor: alpha("#13324b", 0.1),
        backgroundColor: session.is_current
          ? alpha("#0b5fa5", 0.08)
          : alpha("#ffffff", 0.74),
      }}
    >
      <Stack spacing={1.5}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.25}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
        >
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Avatar
              sx={{
                width: 38,
                height: 38,
                bgcolor: alpha("#13324b", 0.08),
                color: "#13324b",
              }}
            >
              <DeviceIcon fontSize="small" />
            </Avatar>
            <Box>
              <Typography sx={{ fontWeight: 700 }}>
                {session.device_label || "Unknown device"}
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {[session.browser, session.operating_system, session.ip_address]
                  .filter(Boolean)
                  .join(" • ") || "No device details available"}
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {session.is_current ? (
              <Chip
                color="primary"
                icon={<CheckCircleOutline />}
                label="Current device"
              />
            ) : null}
            <Chip
              size="small"
              color={statusColor}
              label={session.is_active ? "Active" : "Closed"}
              variant={session.is_active ? "filled" : "outlined"}
            />
          </Stack>
        </Stack>

        <Grid container spacing={1.5}>
          <Grid item xs={12} sm={4}>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Signed in
            </Typography>
            <Typography variant="body2">{formatDateTime(session.signed_in_at)}</Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Last seen
            </Typography>
            <Typography variant="body2">
              {formatDateTime(session.last_seen_at)} ({formatRelativeTime(session.last_seen_at)})
            </Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Sign-out status
            </Typography>
            <Typography variant="body2">
              {session.signed_out_at
                ? `${formatDateTime(session.signed_out_at)}${
                    session.sign_out_reason_name
                      ? ` • ${formatReasonLabel(session.sign_out_reason_name)}`
                      : ""
                  }`
                : "Still active"}
            </Typography>
          </Grid>
        </Grid>

        <Box>
          <Button
            variant={session.is_current ? "contained" : "outlined"}
            color={session.is_current ? "primary" : "error"}
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

function KnownDeviceRow({ device }: { device: KnownDeviceSummary }) {
  const DeviceIcon = getDeviceIcon(device.device_type);

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 3,
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
          spacing={1.25}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
        >
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Avatar
              sx={{
                width: 38,
                height: 38,
                bgcolor: alpha("#13324b", 0.08),
                color: "#13324b",
              }}
            >
              <DeviceIcon fontSize="small" />
            </Avatar>
            <Box>
              <Typography sx={{ fontWeight: 700 }}>
                {device.device_label || "Unknown device"}
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {[device.browser, device.operating_system, device.device_type]
                  .filter(Boolean)
                  .join(" • ") || "No device details available"}
              </Typography>
            </Box>
          </Stack>
          {device.is_current_device ? (
            <Chip color="primary" icon={<CheckCircleOutline />} label="Current device" />
          ) : null}
        </Stack>

        <Grid container spacing={1.5}>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Sessions
            </Typography>
            <Typography variant="body2">{device.session_count}</Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Active now
            </Typography>
            <Typography variant="body2">{device.active_session_count}</Typography>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              First seen
            </Typography>
            <Typography variant="body2">
              {formatDateTime(device.signed_in_at_first)}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Last seen
            </Typography>
            <Typography variant="body2">{formatDateTime(device.last_seen_at)}</Typography>
          </Grid>
        </Grid>
      </Stack>
    </Box>
  );
}

export const Settings = () => {
  const authUser = useAuthUser();
  const user = authUser();
  const signIn = useSignIn();
  const fetchWithAuth = useFetchWithAuth();
  const queryClient = useQueryClient();
  const trackedSession = getTrackedSession();

  const scopes: Set<string> = new Set(
    authUser()?.user_role?.security_scopes?.map(
      (scope: SecurityScope) => scope.scope_string,
    ) ?? [],
  );

  const hasReadScope = scopes.has("read");
  const hasAdminScope = scopes.has("admin");
  const redirectOptions = useMemo(
    () =>
      navConfig.filter((item) => {
        if (!item.role) return true;
        if (item.role === "Technician") return hasReadScope;
        if (item.role === "Admin") return hasAdminScope;
        return false;
      }),
    [hasAdminScope, hasReadScope],
  );

  const [isEditing, setIsEditing] = useState(false);
  const [avatarFiles, setAvatarFiles] = useState<File[]>([]);
  const [avatarUploadKey, setAvatarUploadKey] = useState(0);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isClearingCachedData, setIsClearingCachedData] = useState(false);

  const {
    control: displayNameControl,
    handleSubmit: displayNameHandleSubmit,
    reset: displayNameReset,
  } = useForm<{ display_name: string }>({
    defaultValues: { display_name: user?.display_name ?? "" },
  });

  const displayNameMutation = useMutation({
    mutationFn: async (data: { display_name: string }) =>
      fetchWithAuth({
        method: "POST",
        route: "/settings/display_name",
        body: data,
      }),
    onSuccess: (responseJson: { display_name: string }) => {
      enqueueSnackbar("Display name updated successfully.", {
        variant: "success",
      });

      if (user) {
        signIn({
          token: localStorage.getItem("_auth")!,
          expiresIn: 300,
          tokenType: "bearer",
          authState: {
            ...user,
            display_name: responseJson.display_name,
          },
        });
      }

      setIsEditing(false);
    },
    onError: () => {
      enqueueSnackbar("Failed to update display name.", { variant: "error" });
    },
  });

  const onDisplayNameSubmit = ({ display_name }: { display_name: string }) => {
    displayNameMutation.mutate({ display_name });
  };

  const getRedirectPageQuery = useQuery({
    queryKey: ["redirectPage"],
    queryFn: async () =>
      fetchWithAuth({
        method: "GET",
        route: "/settings/redirect_page",
      }),
  });

  const redirectMutation = useMutation({
    mutationFn: async (data: { redirect_page: string }) =>
      fetchWithAuth({
        method: "POST",
        route: "/settings/redirect_page",
        body: data,
      }),
    onSuccess: (responseJson: { message: string; redirect_page: string }) => {
      enqueueSnackbar("Redirect page updated successfully.", {
        variant: "success",
      });
      queryClient.invalidateQueries(["redirectPage"]);

      if (user) {
        signIn({
          token: localStorage.getItem("_auth")!,
          expiresIn: 300,
          tokenType: "bearer",
          authState: {
            ...user,
            redirect_page: responseJson.redirect_page,
          },
        });
      }
    },
    onError: () => {
      enqueueSnackbar("Failed to update redirect page.", { variant: "error" });
    },
  });

  const {
    control: redirectControl,
    handleSubmit: handleRedirectSubmit,
    reset: redirectReset,
    watch: watchRedirectPage,
  } = useForm({
    resolver: yupResolver(redirectSchema),
    defaultValues: {
      redirect_page: getRedirectPageQuery?.data?.redirect_page ?? "/",
    },
    values: { redirect_page: getRedirectPageQuery?.data?.redirect_page ?? "/" },
  });

  useEffect(() => {
    if (getRedirectPageQuery.data?.redirect_page) {
      redirectReset({ redirect_page: getRedirectPageQuery.data.redirect_page });
    }
  }, [getRedirectPageQuery.data, redirectReset]);

  const onRedirectSubmit = (data: { redirect_page: string }) => {
    redirectMutation.mutate(data);
  };

  const currentRedirectPage = getRedirectPageQuery.data?.redirect_page ?? "/";
  const selectedRedirectPage = watchRedirectPage("redirect_page");
  const isRedirectSelectionUnchanged =
    selectedRedirectPage === currentRedirectPage;

  const passwordMutation = useMutation({
    mutationFn: async (data: {
      currentPassword: string;
      newPassword: string;
    }) =>
      fetchWithAuth({
        method: "POST",
        route: "/settings/password_reset",
        body: {
          current_password: data.currentPassword,
          new_password: data.newPassword,
        },
      }),
    onSuccess: () => {
      enqueueSnackbar("Password updated successfully.", {
        variant: "success",
      });
      passwordReset({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    },
    onError: (error: Error) => {
      enqueueSnackbar(error.message || "Failed to update password.", {
        variant: "error",
      });
    },
  });

  const {
    control: passwordControl,
    handleSubmit: handlePasswordSubmit,
    reset: passwordReset,
    formState: { errors: passwordErrors },
  } = useForm({
    resolver: yupResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onPasswordSubmit = (data: {
    currentPassword: string;
    newPassword: string;
  }) => {
    passwordMutation.mutate({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
  };

  const avatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("avatar", file);

      return fetchWithAuth({
        method: "POST",
        route: "/settings/avatar",
        body: formData,
      });
    },
    onSuccess: (responseJson: { avatar_img: string }) => {
      enqueueSnackbar("Avatar updated successfully.", {
        variant: "success",
      });
      setAvatarFiles([]);
      setAvatarUploadKey((current) => current + 1);

      if (user) {
        signIn({
          token: localStorage.getItem("_auth")!,
          expiresIn: 300,
          tokenType: "bearer",
          authState: {
            ...user,
            avatar_img: responseJson.avatar_img,
          },
        });
      }
    },
    onError: () => {
      enqueueSnackbar("Failed to update avatar.", { variant: "error" });
    },
  });

  const clearAvatarMutation = useMutation({
    mutationFn: async () =>
      fetchWithAuth({
        method: "DELETE",
        route: "/settings/avatar",
      }),
    onSuccess: () => {
      enqueueSnackbar("Avatar removed successfully.", {
        variant: "success",
      });
      setAvatarFiles([]);
      setAvatarUploadKey((current) => current + 1);

      if (user) {
        signIn({
          token: localStorage.getItem("_auth")!,
          expiresIn: 300,
          tokenType: "bearer",
          authState: {
            ...user,
            avatar_img: null,
          },
        });
      }
    },
    onError: () => {
      enqueueSnackbar("Failed to remove avatar.", { variant: "error" });
    },
  });

  const onAvatarSubmit = () => {
    const file = avatarFiles[0];
    if (!file) {
      enqueueSnackbar("Select an image before saving your avatar.", {
        variant: "warning",
      });
      return;
    }

    avatarMutation.mutate(file);
  };

  const userSessionsQuery = useQuery<UserSessionsResponse>({
    queryKey: ["userSessions"],
    queryFn: async () =>
      fetchWithAuth({
        method: "GET",
        route: "/user-sessions",
      }),
  });

  const closeSessionMutation = useMutation({
    mutationFn: async (sessionIdentifier: string) =>
      fetchWithAuth({
        method: "DELETE",
        route: `/user-sessions/${sessionIdentifier}`,
      }),
    onSuccess: () => {
      enqueueSnackbar("Session closed successfully.", {
        variant: "success",
      });
      queryClient.invalidateQueries(["userSessions"]);
    },
    onError: (error: Error) => {
      enqueueSnackbar(error.message || "Failed to close session.", {
        variant: "error",
      });
    },
  });

  const sessions = useMemo(
    () =>
      (userSessionsQuery.data?.sessions ?? []).map((session) => ({
        ...session,
        is_current:
          session.is_current ||
          session.session_identifier === trackedSession?.sessionIdentifier,
      })),
    [trackedSession?.sessionIdentifier, userSessionsQuery.data?.sessions],
  );

  const knownDevices = useMemo(
    () => userSessionsQuery.data?.known_devices ?? [],
    [userSessionsQuery.data?.known_devices],
  );

  const handleClearCachedData = () => {
    setIsClearingCachedData(true);

    try {
      clearSavedQueryLocalStorage();
      queryClient.clear();
      enqueueSnackbar("Saved cache cleared.", {
        variant: "success",
      });
    } catch {
      enqueueSnackbar("Failed to clear cached data.", {
        variant: "error",
      });
    } finally {
      setIsClearingCachedData(false);
    }
  };

  return (
    <BackgroundBox>
      <Card sx={{ height: "fit-content" }}>
        <CustomCardHeader title="Settings" icon={SettingsIcon} />
        <CardContent>
          <Grid container spacing={3}>
          <Grid item xs={12} lg={7}>
            <Stack spacing={3}>
              <SectionCard
                title="Profile"
                description="Review your account information and keep your profile up to date."
                icon={ShieldOutlined}
              >
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <InfoTile
                      label="Full name"
                      compact
                      value={
                        <Typography sx={{ fontWeight: 700 }}>
                          {user?.full_name ?? "N/A"}
                        </Typography>
                      }
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <InfoTile
                      label="Email"
                      value={
                        <Typography sx={{ fontWeight: 700 }}>
                          {user?.email ?? "N/A"}
                        </Typography>
                      }
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <InfoTile
                      label="Username"
                      value={
                        <Typography sx={{ fontWeight: 700 }}>
                          {user?.username ?? "N/A"}
                        </Typography>
                      }
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <InfoTile
                      label="Role"
                      value={<RoleChip role={user?.user_role?.name ?? "N/A"} />}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <InfoTile
                      label="Account status"
                      value={<IsTrueChip assert={!user?.disabled} />}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <InfoTile
                      label="Access scopes"
                      value={
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          <Chip
                            size="small"
                            color={hasReadScope ? "success" : "default"}
                            label={hasReadScope ? "Read access" : "No read access"}
                          />
                          {hasAdminScope ? (
                            <Chip size="small" color="primary" label="Admin access" />
                          ) : null}
                        </Stack>
                      }
                    />
                  </Grid>
                </Grid>

                <Divider />

                <Box
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    border: "1px solid",
                    borderColor: alpha("#13324b", 0.1),
                    backgroundColor: alpha("#ffffff", 0.72),
                  }}
                >
                  <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={2}
                    alignItems={{ xs: "stretch", md: "center" }}
                    justifyContent="space-between"
                  >
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        Display name
                      </Typography>
                      <Typography variant="body2" sx={{ color: "text.secondary", mb: 1.5 }}>
                        This is how your name appears across the application.
                      </Typography>
                    </Box>

                    {!isEditing ? (
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1}
                        alignItems={{ xs: "stretch", sm: "center" }}
                      >
                        <Chip
                          label={user?.display_name ?? "N/A"}
                          variant="outlined"
                          sx={{ fontFamily: "monospace" }}
                        />
                        <Button
                          variant="outlined"
                          startIcon={<Edit />}
                          onClick={() => setIsEditing(true)}
                        >
                          Edit
                        </Button>
                      </Stack>
                    ) : (
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1}
                        sx={{ width: { xs: "100%", md: "auto" } }}
                      >
                        <Controller
                          name="display_name"
                          control={displayNameControl}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              size="small"
                              autoFocus
                              label="Display name"
                              sx={{ minWidth: { xs: "100%", sm: 280 } }}
                            />
                          )}
                        />
                        <Button
                          color="inherit"
                          variant="outlined"
                          onClick={() => {
                            displayNameReset({
                              display_name: user?.display_name ?? "",
                            });
                            setIsEditing(false);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="contained"
                          onClick={displayNameHandleSubmit(onDisplayNameSubmit)}
                          disabled={displayNameMutation.isLoading}
                        >
                          Save
                        </Button>
                      </Stack>
                    )}
                  </Stack>
                </Box>

                <Box
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    border: "1px solid",
                    borderColor: alpha("#13324b", 0.1),
                    backgroundColor: alpha("#ffffff", 0.72),
                  }}
                >
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        Avatar
                      </Typography>
                      <Typography variant="body2" sx={{ color: "text.secondary" }}>
                        Upload or replace your account image.
                      </Typography>
                    </Box>
                    <Grid container spacing={2} alignItems="flex-start">
                      <Grid item xs={12} md={7}>
                        <ImageUploadWithPreview
                          key={avatarUploadKey}
                          fileLimit={1}
                          onFilesChange={setAvatarFiles}
                        />
                      </Grid>
                      <Grid item xs={12} md={5}>
                        <Stack spacing={1.5}>
                          <Button
                            variant="contained"
                            onClick={onAvatarSubmit}
                            disabled={
                              avatarFiles.length === 0 ||
                              avatarMutation.isLoading ||
                              clearAvatarMutation.isLoading
                            }
                          >
                            Save avatar
                          </Button>
                          <Button
                            variant="outlined"
                            color="error"
                            onClick={() => clearAvatarMutation.mutate()}
                            disabled={
                              !user?.avatar_img ||
                              avatarMutation.isLoading ||
                              clearAvatarMutation.isLoading
                            }
                          >
                            Remove avatar
                          </Button>
                        </Stack>
                      </Grid>
                    </Grid>
                  </Stack>
                </Box>
              </SectionCard>

              <SectionCard
                title="Preferences"
                description="Control your landing page and local application data."
                icon={SettingsApplications}
              >
                <Box
                  component="form"
                  onSubmit={handleRedirectSubmit(onRedirectSubmit)}
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    border: "1px solid",
                    borderColor: alpha("#13324b", 0.1),
                    backgroundColor: alpha("#ffffff", 0.72),
                  }}
                >
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        Default landing page
                      </Typography>
                      <Typography variant="body2" sx={{ color: "text.secondary" }}>
                        Choose where the app should take you after you sign in.
                      </Typography>
                    </Box>
                    {getRedirectPageQuery.isLoading ? (
                      <Skeleton variant="rounded" height={56} />
                    ) : (
                      <Controller
                        name="redirect_page"
                        control={redirectControl}
                        render={({ field }) => (
                          <TextField {...field} select fullWidth label="Redirect page">
                            {redirectOptions.map((route) => {
                              const RouteIcon = route.icon;

                              return (
                                <MenuItem key={route.path} value={route.path}>
                                  <ListItemIcon sx={{ minWidth: 36, color: "inherit" }}>
                                    <RouteIcon fontSize="small" />
                                  </ListItemIcon>
                                  {route.label}
                                </MenuItem>
                              );
                            })}
                          </TextField>
                        )}
                      />
                    )}
                    <Box>
                      <Button
                        type="submit"
                        variant="contained"
                        disabled={
                          getRedirectPageQuery.isLoading ||
                          redirectMutation.isLoading ||
                          isRedirectSelectionUnchanged
                        }
                      >
                        Save preference
                      </Button>
                    </Box>
                  </Stack>
                </Box>

                <Box
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    border: "1px solid",
                    borderColor: alpha("#13324b", 0.1),
                    backgroundColor: alpha("#ffffff", 0.72),
                  }}
                >
                  <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={2}
                    alignItems={{ xs: "stretch", md: "center" }}
                    justifyContent="space-between"
                  >
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        Cached map data
                      </Typography>
                      <Typography variant="body2" sx={{ color: "text.secondary" }}>
                        Clear saved client-side caches if the app feels out of sync.
                      </Typography>
                    </Box>
                    <Button
                      variant="outlined"
                      color="inherit"
                      onClick={handleClearCachedData}
                      disabled={isClearingCachedData}
                    >
                      Clear cache
                    </Button>
                  </Stack>
                </Box>
              </SectionCard>

              <SectionCard
                title="Security"
                description="Update your password and review account access posture."
                icon={ShieldOutlined}
              >
                <Box
                  component="form"
                  onSubmit={handlePasswordSubmit(onPasswordSubmit)}
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    border: "1px solid",
                    borderColor: alpha("#13324b", 0.1),
                    backgroundColor: alpha("#ffffff", 0.72),
                  }}
                >
                  <Stack spacing={2}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      Change password
                    </Typography>
                    <Controller
                      name="currentPassword"
                      control={passwordControl}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Current password"
                          type={showCurrentPassword ? "text" : "password"}
                          error={!!passwordErrors.currentPassword}
                          helperText={passwordErrors.currentPassword?.message}
                          InputProps={{
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  onClick={() =>
                                    setShowCurrentPassword((current) => !current)
                                  }
                                  edge="end"
                                >
                                  {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                                </IconButton>
                              </InputAdornment>
                            ),
                          }}
                        />
                      )}
                    />
                    <Controller
                      name="newPassword"
                      control={passwordControl}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="New password"
                          type={showNewPassword ? "text" : "password"}
                          error={!!passwordErrors.newPassword}
                          helperText={passwordErrors.newPassword?.message}
                          InputProps={{
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  onClick={() => setShowNewPassword((current) => !current)}
                                  edge="end"
                                >
                                  {showNewPassword ? <VisibilityOff /> : <Visibility />}
                                </IconButton>
                              </InputAdornment>
                            ),
                          }}
                        />
                      )}
                    />
                    <Controller
                      name="confirmPassword"
                      control={passwordControl}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Confirm new password"
                          type={showConfirmPassword ? "text" : "password"}
                          error={!!passwordErrors.confirmPassword}
                          helperText={passwordErrors.confirmPassword?.message}
                          InputProps={{
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  onClick={() =>
                                    setShowConfirmPassword((current) => !current)
                                  }
                                  edge="end"
                                >
                                  {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                                </IconButton>
                              </InputAdornment>
                            ),
                          }}
                        />
                      )}
                    />
                    <Box>
                      <Button
                        type="submit"
                        variant="contained"
                        disabled={passwordMutation.isLoading}
                      >
                        Update password
                      </Button>
                    </Box>
                  </Stack>
                </Box>
              </SectionCard>
            </Stack>
          </Grid>

          <Grid item xs={12} lg={5}>
            <Stack spacing={3}>
              <SectionCard
                title="Sessions History"
                description="Review sign-ins across devices and close sessions that are no longer needed."
                icon={HistoryRounded}
              >
                {userSessionsQuery.isLoading ? (
                  <Stack spacing={1.5}>
                    <Skeleton variant="rounded" height={142} />
                    <Skeleton variant="rounded" height={142} />
                    <Skeleton variant="rounded" height={142} />
                  </Stack>
                ) : userSessionsQuery.isError ? (
                  <Alert severity="error">
                    Unable to load session history right now.
                  </Alert>
                ) : sessions.length === 0 ? (
                  <Alert severity="info">No recorded sessions were found.</Alert>
                ) : (
                  <Stack spacing={1.5}>
                    {sessions.map((session) => (
                      <SessionRow
                        key={session.session_identifier}
                        session={session}
                        isClosing={
                          closeSessionMutation.isLoading &&
                          closeSessionMutation.variables === session.session_identifier
                        }
                        onCloseSession={(sessionIdentifier) =>
                          closeSessionMutation.mutate(sessionIdentifier)
                        }
                      />
                    ))}
                  </Stack>
                )}
              </SectionCard>

              <SectionCard
                title="Known Devices"
                description="See the devices recognized for your account and clearly identify the one you are using now."
                icon={DevicesRounded}
              >
                {userSessionsQuery.isLoading ? (
                  <Stack spacing={1.5}>
                    <Skeleton variant="rounded" height={118} />
                    <Skeleton variant="rounded" height={118} />
                  </Stack>
                ) : userSessionsQuery.isError ? (
                  <Alert severity="error">
                    Unable to load known devices right now.
                  </Alert>
                ) : knownDevices.length === 0 ? (
                  <Alert severity="info">No known devices were found.</Alert>
                ) : (
                  <Stack spacing={1.5}>
                    {knownDevices.map((device) => (
                      <KnownDeviceRow key={device.device_key} device={device} />
                    ))}
                  </Stack>
                )}
              </SectionCard>
            </Stack>
          </Grid>
          </Grid>
        </CardContent>
      </Card>
    </BackgroundBox>
  );
};
