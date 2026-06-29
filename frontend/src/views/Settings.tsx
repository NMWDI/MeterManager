import { useEffect, useMemo, useState } from "react";
import * as yup from "yup";
import { enqueueSnackbar } from "notistack";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm } from "react-hook-form";
import { Grid, Stack } from "@mui/material";
import {
  DevicesRounded,
  HistoryRounded,
  SettingsApplications,
  ShieldOutlined,
} from "@mui/icons-material";
import { useSignIn, useAuthUser } from "react-auth-kit";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { useNavigate } from "@tanstack/react-router";
import { BackgroundBox, SectionCard } from "@/components";
import { navConfig } from "@/constants";
import { useFetchWithAuth } from "@/hooks";
import { SecurityScope, UserSessionsResponse } from "@/interfaces";
import { Route } from "@/routes/settings";
import { getTrackedSession } from "@/utils/SessionTracking";
import {
  PasswordEvaluation,
  PasswordStatus,
  clearSavedQueryLocalStorage,
  evaluatePasswordLocally,
} from "@/utils";
import {
  KnownDevicesSection,
  PreferencesSection,
  ProfileSection,
  SecuritySection,
  SessionHistorySection,
} from "./Settings/components";

const redirectSchema = yup.object().shape({
  redirect_page: yup.string().required("Please select a redirect page"),
});

const passwordSchema = yup.object().shape({
  currentPassword: yup.string().required("Current password is required"),
  newPassword: yup
    .string()
    .test(
      "password-policy",
      "New password does not meet password requirements",
      (value) =>
        !!value && evaluatePasswordLocally(value).is_policy_compliant,
    )
    .required("New password is required"),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref("newPassword")], "Passwords must match")
    .required("Please confirm new password"),
});

export const Settings = () => {
  const navigate = useNavigate();
  const search = Route.useSearch();
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

  const setSearch = (updater: (prev: typeof search) => typeof search) => {
    navigate({
      to: "/settings",
      search: (prev) => updater(prev as typeof search),
      replace: true,
    });
  };

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
  } = useForm<{ redirect_page: string }>({
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
      queryClient.invalidateQueries(["passwordStatus"]);
    },
    onError: (error: Error) => {
      enqueueSnackbar(error.message || "Failed to update password.", {
        variant: "error",
      });
    },
  });

  const passwordStatusQuery = useQuery<PasswordStatus>({
    queryKey: ["passwordStatus"],
    queryFn: async () =>
      fetchWithAuth({
        method: "GET",
        route: "/settings/password_status",
      }),
  });

  const passwordEvaluationMutation = useMutation({
    mutationFn: async (password: string): Promise<PasswordEvaluation> =>
      fetchWithAuth({
        method: "POST",
        route: "/settings/password/evaluate",
        body: { password },
      }),
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
    confirmPassword: string;
  }) => {
    passwordMutation.mutate({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
  };

  const onNewPasswordBlur = (password: string) => {
    if (!password) return;
    passwordEvaluationMutation.mutate(password);
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

  const activeSessions = useMemo(
    () => sessions.filter((session) => session.is_active),
    [sessions],
  );

  const closedSessions = useMemo(
    () => sessions.filter((session) => !session.is_active),
    [sessions],
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
      <Grid container spacing={2}>
        <Grid item xs={12} lg={7}>
          <Stack spacing={2}>
            <SectionCard
              title="Profile"
              description="Review your account information and keep your profile up to date."
              icon={ShieldOutlined}
            >
              <ProfileSection
                user={user ?? null}
                isEditing={isEditing}
                setIsEditing={setIsEditing}
                displayNameControl={displayNameControl}
                onCancelEdit={() => {
                  displayNameReset({
                    display_name: user?.display_name ?? "",
                  });
                  setIsEditing(false);
                }}
                onSaveDisplayName={displayNameHandleSubmit(onDisplayNameSubmit)}
                isSavingDisplayName={displayNameMutation.isLoading}
                avatarFiles={avatarFiles}
                setAvatarFiles={setAvatarFiles}
                avatarUploadKey={avatarUploadKey}
                onAvatarSubmit={onAvatarSubmit}
                onClearAvatar={() => clearAvatarMutation.mutate()}
                isSavingAvatar={avatarMutation.isLoading}
                isRemovingAvatar={clearAvatarMutation.isLoading}
              />
            </SectionCard>

            <SectionCard title="Preferences" icon={SettingsApplications}>
              <PreferencesSection
                redirectControl={redirectControl}
                redirectOptions={redirectOptions}
                onRedirectSubmit={handleRedirectSubmit(onRedirectSubmit)}
                isRedirectLoading={getRedirectPageQuery.isLoading}
                isRedirectSaving={redirectMutation.isLoading}
                isRedirectSelectionUnchanged={isRedirectSelectionUnchanged}
                onClearCachedData={handleClearCachedData}
                isClearingCachedData={isClearingCachedData}
              />
            </SectionCard>

            <SectionCard
              title="Security"
              description="Update your password and review account access posture."
              icon={ShieldOutlined}
            >
              <SecuritySection
                passwordControl={passwordControl}
                passwordErrors={passwordErrors}
                handlePasswordSubmit={handlePasswordSubmit}
                onPasswordSubmit={onPasswordSubmit}
                showCurrentPassword={showCurrentPassword}
                setShowCurrentPassword={setShowCurrentPassword}
                showNewPassword={showNewPassword}
                setShowNewPassword={setShowNewPassword}
                showConfirmPassword={showConfirmPassword}
                setShowConfirmPassword={setShowConfirmPassword}
                isSavingPassword={passwordMutation.isLoading}
                passwordStatus={passwordStatusQuery.data}
                passwordEvaluation={passwordEvaluationMutation.data}
                checkedPassword={passwordEvaluationMutation.variables}
                isCheckingPassword={passwordEvaluationMutation.isLoading}
                onNewPasswordBlur={onNewPasswordBlur}
              />
            </SectionCard>
          </Stack>
        </Grid>

        <Grid item xs={12} lg={5}>
          <Stack spacing={2}>
            <SectionCard
              title="Sessions History"
              description="Review sign-ins across devices and close sessions that are no longer needed."
              icon={HistoryRounded}
            >
              <SessionHistorySection
                isLoading={userSessionsQuery.isLoading}
                isError={userSessionsQuery.isError}
                activeSessions={activeSessions}
                closedSessions={closedSessions}
                showClosedSessions={search.showClosedSessions}
                onShowClosedSessionsChange={(nextValue) =>
                  setSearch((prev) => ({
                    ...prev,
                    showClosedSessions: nextValue,
                  }))
                }
                closeSession={(sessionIdentifier) =>
                  closeSessionMutation.mutate(sessionIdentifier)
                }
                closingSessionIdentifier={
                  closeSessionMutation.isLoading
                    ? closeSessionMutation.variables
                    : undefined
                }
              />
            </SectionCard>

            <SectionCard title="Known Devices" icon={DevicesRounded}>
              <KnownDevicesSection
                isLoading={userSessionsQuery.isLoading}
                isError={userSessionsQuery.isError}
                knownDevices={knownDevices}
              />
            </SectionCard>
          </Stack>
        </Grid>
      </Grid>
    </BackgroundBox>
  );
};
