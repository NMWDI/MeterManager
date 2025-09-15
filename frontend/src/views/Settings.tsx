import * as yup from 'yup';
import { enqueueSnackbar } from "notistack";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm, Controller } from "react-hook-form";
import {
  Card,
  CardContent,
  Divider,
  Typography,
  Box,
  MenuItem,
  TextField,
  Grid,
  ListItemIcon,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  ListSubheader,
  Skeleton,
  IconButton,
  Stack,
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import { useAuthUser, useSignIn } from "react-auth-kit";
import {
  Check,
  Close,
  Edit,
  ExpandMore
} from '@mui/icons-material';
import { BackgroundBox, CustomCardHeader, IsTrueChip, RoleChip } from "../components";
import { navConfig } from '../constants';
import { useFetchWithAuth } from '../hooks';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { SecurityScope } from '../interfaces';
import { useEffect, useState } from 'react';

const redirectOptions = {
  public: navConfig.filter(item => !item.role),
  technician: navConfig.filter(item => item.role === "Technician"),
  admin: navConfig.filter(item => item.role === "Admin"),
};

const redirectSchema = yup.object().shape({
  redirect_page: yup.string().required("Please select a redirect page"),
});

const passwordSchema = yup.object().shape({
  currentPassword: yup.string().required("Current password is required"),
  newPassword: yup.string().required("New password is required"),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref("newPassword")], "Passwords must match")
    .required("Please confirm new password"),
});

export const Settings = () => {
  const authUser = useAuthUser();
  const user = authUser();
  const signIn = useSignIn();
  const fetchWithAuth = useFetchWithAuth();
  const scopes: Set<string> = new Set(
    authUser()?.user_role?.security_scopes?.map(
      (scope: SecurityScope) => scope.scope_string
    ) ?? []
  );

  const hasReadScope = scopes.has("read");
  const hasAdminScope = scopes.has("admin");

  const [isEditing, setIsEditing] = useState(false);

  const {
    control: displayNameControl,
    handleSubmit: displayNameHandleSubmit,
    reset: displayNameReset,
  } = useForm<{ display_name: string }>({
    defaultValues: { display_name: user?.display_name ?? "" },
  });

  const displayNameMutation = useMutation({
    mutationFn: async (data: { display_name: string }) => {
      return await fetchWithAuth({
        method: "POST",
        route: "/settings/display_name",
        body: data,
      });
    },
    onSuccess: (responseJson: any) => {
      enqueueSnackbar("Display name updated successfully.", { variant: "success" });

      // Grab the current auth state & update it
      if (user) {
        signIn({
          token: localStorage.getItem("_auth")!, // reuse current token
          expiresIn: 300,                        // reuse the expiry window you want
          tokenType: "bearer",
          authState: {
            ...user,
            display_name: responseJson.display_name,     // overwrite just this field
          },
        });
      }
    },
    onError: () => {
      enqueueSnackbar("Failed to update display name.", { variant: "error" });
    },
  });

  const onDisplayNameSubmit = ({ display_name }: { display_name: string }) => {
    displayNameMutation.mutate({ display_name })
  }

  const queryClient = useQueryClient();
  const getRedirectPageQuery = useQuery({
    queryKey: ["redirectPage"],
    queryFn: async () => fetchWithAuth({
      method: "GET",
      route: "/settings/redirect_page",
    }),
  });

  const redirectMutation = useMutation({
    mutationFn: async (data: { redirect_page: string }) => {
      return await fetchWithAuth({
        method: "POST",
        route: "/settings/redirect_page",
        body: data,
      });
    },
    onSuccess: (responseJson: { message: string, redirect_page: string }) => {
      enqueueSnackbar("Redirect page updated successfully.", { variant: "success" });
      queryClient.invalidateQueries(["redirectPage"]);

      // Grab the current auth state & update it
      if (user) {
        signIn({
          token: localStorage.getItem("_auth")!, // reuse current token
          expiresIn: 300,                        // reuse the expiry window you want
          tokenType: "bearer",
          authState: {
            ...user,
            redirect_page: responseJson.redirect_page,     // overwrite just this field
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
    reset: redirectReset
  } = useForm({
    resolver: yupResolver(redirectSchema),
    defaultValues: { redirect_page: getRedirectPageQuery?.data?.redirect_page ?? "/" },
    values: { redirect_page: getRedirectPageQuery?.data?.redirect_page ?? "/" }, // react-hook-form v7 pattern for sync
  });

  useEffect(() => {
    if (getRedirectPageQuery.data?.redirect_page) {
      redirectReset({ redirect_page: getRedirectPageQuery.data.redirect_page });
    }
  }, [getRedirectPageQuery.data, redirectReset]);

  const onRedirectSubmit = (data: any) => {
    redirectMutation.mutate(data);
  };

  const passwordMutation = useMutation({
    mutationFn: async (data: {
      currentPassword: string;
      newPassword: string;
    }) => {
      const res = await fetch("/settings/password_reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("_auth")}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Password reset failed");
      return await res.json();
    },
    onSuccess: () => {
      enqueueSnackbar("Password reset request submitted.", { variant: "success" });
    },
  });

  const {
    control: passwordControl,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
  } = useForm({
    resolver: yupResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onPasswordSubmit = (data: any) => {
    passwordMutation.mutate({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
  };

  return (
    <BackgroundBox>
      <Card sx={{ height: "fit-content" }}>
        <CustomCardHeader title="Account Settings" icon={SettingsIcon} />
        <CardContent>
          {/* User Info */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h5" gutterBottom>
              User Information
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} lg={4} sx={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <Typography fontWeight="bold">Full Name:</Typography>
                <Chip sx={{ fontFamily: "monospace" }} label={user?.full_name ?? "N/A"} variant='outlined' />
              </Grid>
              <Grid item xs={12} sm={6} lg={4} sx={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <Typography fontWeight="bold">Email:</Typography>
                <Chip sx={{ fontFamily: "monospace" }} label={user?.email ?? "N/A"} variant='outlined' />
              </Grid>
              <Grid item xs={12} sm={6} lg={4} sx={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <Typography fontWeight="bold">Username:</Typography>
                <Chip sx={{ fontFamily: "monospace" }} label={user?.username ?? "N/A"} variant='outlined' />
              </Grid>
              <Grid item xs={12} sm={6} lg={4} sx={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {!isEditing ? (
                  <>
                    <Typography fontWeight="bold">Display Name:</Typography>
                    <Chip
                      sx={{ fontFamily: "monospace" }}
                      label={user?.display_name ?? "N/A"}
                      variant="outlined"
                    />
                    <IconButton aria-label="edit display name" onClick={() => setIsEditing(true)}>
                      <Edit />
                    </IconButton>
                  </>
                ) : (
                  <>
                    <Controller
                      name="display_name"
                      control={displayNameControl}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          size="small"
                          fullWidth
                          autoFocus
                          label="New Display Name"
                        />
                      )}
                    />
                    <Stack direction="row" spacing={1}>
                      <IconButton
                        color="error"
                        onClick={() => {
                          displayNameReset({ display_name: user?.display_name ?? "" });
                          setIsEditing(false);
                        }}
                      >
                        <Close />
                      </IconButton>
                      <IconButton color="primary" onClick={displayNameHandleSubmit(onDisplayNameSubmit)}>
                        <Check />
                      </IconButton>
                    </Stack>
                  </>
                )}
              </Grid>
              <Grid item xs={12} sm={6} lg={4} sx={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <Typography fontWeight="bold">Role:</Typography>
                <RoleChip role={user?.user_role?.name ?? "N/A"} />
              </Grid>
              <Grid item xs={12} sm={6} lg={4} sx={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <Typography fontWeight="bold">Active:</Typography>
                <IsTrueChip assert={!user?.disabled} />
              </Grid>
            </Grid>
          </Box>
          <Divider sx={{ my: 2 }} />
          <Typography variant="h5" gutterBottom py={2}>
            Preferences
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography component="span">Redirect Page After Login</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={12} p={2}>
                      <form onSubmit={handleRedirectSubmit(onRedirectSubmit)}>
                        <Grid container spacing={2} alignItems="center">
                          <Grid item xs={12} sm={6}>
                            <Controller
                              name="redirect_page"
                              control={redirectControl}
                              render={({ field }) => {
                                // flatten all available paths
                                const availablePaths = [
                                  ...redirectOptions.public.map(o => o.path),
                                  ...(hasReadScope ? redirectOptions.technician.map(o => o.path) : []),
                                  ...(hasAdminScope ? redirectOptions.admin.map(o => o.path) : []),
                                ];

                                // guard: if no options available yet, render empty select
                                if (getRedirectPageQuery.isFetching && availablePaths.length === 0) {
                                  return (
                                    <Skeleton
                                      variant="rectangular"
                                      width="100%"
                                      height={40}
                                      sx={{ borderRadius: 1 }}
                                    />
                                  );
                                }

                                const safeValue = availablePaths.includes(field.value)
                                  ? field.value
                                  : "/";

                                return (
                                  <TextField
                                    {...field}
                                    select
                                    fullWidth
                                    size='small'
                                    label="Page to redirect after login"
                                    disabled={getRedirectPageQuery?.isFetching || redirectMutation.isLoading}
                                    value={safeValue}
                                    onChange={(e) => field.onChange(e)}
                                  >
                                    {redirectOptions.public.length > 0 && [
                                      <ListSubheader key="public-header" component="div">
                                        Pages
                                      </ListSubheader>,
                                      ...redirectOptions.public.map((option) => {
                                        const Icon = option.icon;
                                        return (
                                          <MenuItem key={option.path} value={option.path}>
                                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                              <ListItemIcon sx={{ minWidth: 0 }}>
                                                <Icon fontSize="small" />
                                              </ListItemIcon>
                                              {option.label}
                                            </Box>
                                          </MenuItem>
                                        );
                                      }),
                                    ]}
                                    {hasReadScope && redirectOptions.technician.length > 0 && [
                                      <ListSubheader key="tech-header" component="div">
                                        <RoleChip role="Technician" /> Pages
                                      </ListSubheader>,
                                      ...redirectOptions.technician.map((option) => {
                                        const Icon = option.icon;
                                        return (
                                          <MenuItem key={option.path} value={option.path}>
                                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                              <ListItemIcon sx={{ minWidth: 0 }}>
                                                <Icon fontSize="small" />
                                              </ListItemIcon>
                                              {option.label}{option.parent === "reports" ? " Report" : null}
                                            </Box>
                                          </MenuItem>
                                        );
                                      }),
                                    ]}
                                    {hasAdminScope && redirectOptions.admin.length > 0 && [
                                      <ListSubheader key="admin-header" component="div">
                                        <RoleChip role="Admin" /> Pages
                                      </ListSubheader>,
                                      ...redirectOptions.admin.map((option) => {
                                        const Icon = option.icon;
                                        return (
                                          <MenuItem key={option.path} value={option.path}>
                                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                              <ListItemIcon sx={{ minWidth: 0 }}>
                                                <Icon fontSize="small" />
                                              </ListItemIcon>
                                              {option.label}
                                            </Box>
                                          </MenuItem>
                                        );
                                      }),
                                    ]}
                                  </TextField>
                                );
                              }}
                            />
                          </Grid>
                          <Grid item xs={12}>
                            <Button type="submit" variant="contained">
                              Save
                            </Button>
                          </Grid>
                        </Grid>
                      </form>
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
              <Accordion disabled>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography component="span">Password Reset</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <form onSubmit={handlePasswordSubmit(onPasswordSubmit)}>
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={4}>
                            <Controller
                              name="currentPassword"
                              control={passwordControl}
                              render={({ field }) => (
                                <TextField
                                  {...field}
                                  type="password"
                                  fullWidth
                                  size='small'
                                  label="Current Password"
                                  error={!!passwordErrors.currentPassword}
                                  helperText={passwordErrors.currentPassword?.message}
                                />
                              )}
                            />
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <Controller
                              name="newPassword"
                              control={passwordControl}
                              render={({ field }) => (
                                <TextField
                                  {...field}
                                  type="password"
                                  fullWidth
                                  size='small'
                                  label="New Password"
                                  error={!!passwordErrors.newPassword}
                                  helperText={passwordErrors.newPassword?.message}
                                />
                              )}
                            />
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <Controller
                              name="confirmPassword"
                              control={passwordControl}
                              render={({ field }) => (
                                <TextField
                                  {...field}
                                  type="password"
                                  fullWidth
                                  size='small'
                                  label="Confirm Password"
                                  error={!!passwordErrors.confirmPassword}
                                  helperText={passwordErrors.confirmPassword?.message}
                                />
                              )}
                            />
                          </Grid>
                        </Grid>
                        <Box sx={{ mt: 2 }}>
                          <Button
                            type="submit"
                            variant="contained"
                            disabled={passwordMutation.isLoading}
                          >
                            Reset Password
                          </Button>
                        </Box>
                      </form>
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </BackgroundBox >
  );
};

