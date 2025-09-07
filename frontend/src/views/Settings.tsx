import * as yup from 'yup';
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
  Alert,
  ListItemIcon,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  Avatar,
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import { useAuthUser } from "react-auth-kit";
import { useEffect, useMemo, useState } from "react";
import {
  ExpandMore
} from '@mui/icons-material';
import { createAvatar } from '@dicebear/core';
import { identicon } from '@dicebear/collection';
import { BackgroundBox, CustomCardHeader, IsTrueChip, RoleChip } from "../components";
import AvatarPicker from '../components/AvatarPicker';
import { navConfig } from '../constants';
import { getRoleColor } from '../utils';

const redirectOptions = navConfig.filter(item => item.role !== "Admin");

const schema = yup.object().shape({
  redirectPage: yup.string().optional(),
  currentPassword: yup.string().optional(),
  newPassword: yup.string().optional(),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref("newPassword"), ""], "Passwords must match"),
});

const FALLBACK_REDIRECT = "/";

export const Settings = () => {
  const authUser = useAuthUser();
  const role: string = authUser()?.user_role?.name;
  const [savedMessage, setSavedMessage] = useState<string>("");
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const avatar = useMemo(() => {
    return createAvatar(identicon, {
      size: 128,
      seed: authUser()?.full_name
    }).toDataUri();
  }, []);

  // always read the latest from localStorage
  const defaultValues = useMemo(() => {
    const stored = localStorage.getItem("redirectPage");
    return {
      redirectPage: stored ?? FALLBACK_REDIRECT,
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    };
  }, []);

  const {
    control,
    handleSubmit,
    watch,
    // formState: { errors, isValid },
  } = useForm({
    resolver: yupResolver(schema),
    mode: "onChange",
    defaultValues,
  });

  // Auto-save redirectPage when it changes
  const redirectPage = watch("redirectPage");
  useEffect(() => {
    if (redirectPage) {
      localStorage.setItem("redirectPage", redirectPage);
      setSavedMessage("Redirect preference saved locally (not synced across devices).");
    }
  }, [redirectPage]);

  const onSubmit = (data: any) => {
    if (data.newPassword && data.currentPassword) {
      // password reset API call would go here
      console.log("Password reset request:", data);
      setSavedMessage("Password reset request submitted.");
    }
  };

  const user = authUser();

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
          <form onSubmit={handleSubmit(onSubmit)}>
            <Typography variant="h5" gutterBottom py={2}>
              Preferences
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography component="span">Update Avatar</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      <Grid item xs="auto" p={2}>
                        <Typography variant="body1" textAlign="center">
                          Current Avatar
                        </Typography>
                        <Box
                          component="img"
                          src={avatar}
                          sx={{ width: 150, height: 150, borderRadius: "50%", mt: 1 }}
                        />
                      </Grid>
                      <Grid item xs="auto" p={2}>
                        <Typography variant="body1" textAlign="center">
                          Selected Avatar
                        </Typography>
                        {userAvatar && (
                          <Box
                            component="img"
                            src={userAvatar}
                            sx={{ width: 150, height: 150, borderRadius: "50%", mt: 1 }}
                          />
                        )}
                      </Grid>
                      <Grid item xs="auto" p={2}>
                        <Typography variant="body1" textAlign="center">
                          Preview
                        </Typography>
                        {userAvatar && (<Button
                          color={getRoleColor(role)}
                          variant="contained"
                          sx={{
                            textTransform: "uppercase",
                            fontFamily: "monospace",
                            fontWeight: "bolder",
                            color: "white",
                          }}
                        >
                          {authUser()?.username ?? "Username"}
                          <Avatar
                            sx={{
                              width: 32,
                              height: 32,
                              ml: 1,
                            }}
                            src={userAvatar}
                          >
                          </Avatar>
                        </Button>
                        )}
                      </Grid>
                      <Grid item xs={12}>
                        <AvatarPicker
                          onSelect={(avatar) => setUserAvatar(avatar)}
                          initialSeed={authUser()?.full_name}
                        />
                      </Grid>
                      <Grid item xs sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
                        <Button variant="contained" sx={{ py: 1, px: 4 }}>
                          Save
                        </Button>
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography component="span">Redirect Page After Login</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <Controller
                          name="redirectPage"
                          control={control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              size='small'
                              select
                              fullWidth
                              label="Page to redirect after login"
                              sx={{ maxWidth: 600 }}
                            >
                              {redirectOptions.map((option) => {
                                const Icon = option.icon;
                                return (
                                  <MenuItem key={option.path} value={option.path}>
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                      <ListItemIcon sx={{ minWidth: 0 }}>
                                        <Icon fontSize="small" />
                                      </ListItemIcon>
                                      <Typography variant="body2">{option.label}{option?.parent ? " Report" : null}</Typography>
                                    </Box>
                                  </MenuItem>
                                );
                              })}
                            </TextField>
                          )}
                        />
                      </Grid>
                      <Grid item xs sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
                        <Button variant="contained" sx={{ py: 1, px: 4 }}>
                          Save
                        </Button>
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
                <Accordion disabled>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography component="span">Password Resetting</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>

                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              </Grid>
            </Grid>
            {/*
            <Divider sx={{ my: 2 }} />
            <Typography variant="h5" gutterBottom py={2}>
              Password Reset
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} lg={4}>
                <Controller
                  name="currentPassword"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Current Password"
                      type="password"
                      fullWidth
                      error={!!errors.currentPassword}
                      helperText={errors.currentPassword?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6} lg={4}>
                <Controller
                  name="newPassword"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="New Password"
                      type="password"
                      fullWidth
                      error={!!errors.newPassword}
                      helperText={errors.newPassword?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6} lg={4}>
                <Controller
                  name="confirmPassword"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Confirm New Password"
                      type="password"
                      fullWidth
                      error={!!errors.confirmPassword}
                      helperText={errors.confirmPassword?.message}
                    />
                  )}
                />
              </Grid>
            </Grid>
            <Box sx={{ mt: 3 }}>
              <Button
                type="submit"
                variant="contained"
                disabled={!isValid}
                sx={{
                  backgroundColor: "darkblue",
                  "&:hover": { backgroundColor: "#00008b" },
                }}
              >
                Save
              </Button>
            </Box>
          */}
          </form>
          {savedMessage && (
            <Alert severity="info" sx={{ mt: 2 }}>
              {savedMessage}
            </Alert>
          )}
        </CardContent>
      </Card>
    </BackgroundBox>
  );
};

