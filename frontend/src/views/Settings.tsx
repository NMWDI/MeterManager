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
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import { useAuthUser } from "react-auth-kit";
import {
  ExpandMore
} from '@mui/icons-material';
import { BackgroundBox, CustomCardHeader, IsTrueChip, RoleChip } from "../components";
import { navConfig } from '../constants';
import { useFetchWithAuth } from '../hooks';
import { useMutation, useQuery } from 'react-query';

const redirectOptions = navConfig.filter(item => item.role !== "Admin");


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
  const fetchWithAuth = useFetchWithAuth();

  const getRedirectPageQuery = useQuery({
    queryKey: ["redirectPage"],
    queryFn: async () => fetchWithAuth({
      method: "GET",
      route: "/settings/redirect_page",
    }),
  });

  const redirectMutation = useMutation({
    mutationFn: async (data: { redirect_page: string }) => {
      await fetchWithAuth({
        method: "POST",
        route: "/settings/redirect_page",
        body: data,
      })
    },
    onSuccess: () => {
      enqueueSnackbar("Redirect page updated successfully.", { variant: "success" });
    },
    onError: () => {
      enqueueSnackbar("Failed to update redirect page.", { variant: "error" });
    },
  });

  const {
    control: redirectControl,
    handleSubmit: handleRedirectSubmit,
  } = useForm({
    resolver: yupResolver(redirectSchema),
    defaultValues: { redirect_page: getRedirectPageQuery?.data?.redirect_page ?? "/" },
    values: { redirect_page: getRedirectPageQuery?.data?.redirect_page ?? "/" }, // react-hook-form v7 pattern for sync
  });

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
      return res.json();
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
                              render={({ field }) => (
                                <TextField
                                  {...field}
                                  select
                                  fullWidth
                                  size='small'
                                  label="Page to redirect after login"
                                  disabled={getRedirectPageQuery?.isFetching || redirectMutation.isLoading}
                                >
                                  {redirectOptions.map((option) => {
                                    const Icon = option.icon;
                                    return (
                                      <MenuItem key={option.path} value={option.path}>
                                        <Box
                                          sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 1,
                                          }}
                                        >
                                          <ListItemIcon sx={{ minWidth: 0 }}>
                                            <Icon fontSize="small" />
                                          </ListItemIcon>
                                          {option.label}
                                        </Box>
                                      </MenuItem>
                                    );
                                  })}
                                </TextField>
                              )}
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

