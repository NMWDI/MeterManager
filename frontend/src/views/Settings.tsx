import * as yup from 'yup';
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm, Controller } from "react-hook-form";
import {
  Card,
  CardContent,
  Divider,
  Typography,
  Box,
  Button,
  MenuItem,
  TextField,
  Grid,
  Alert,
  ListItemIcon,
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import { useAuthUser } from "react-auth-kit";
import { useEffect, useMemo, useState } from "react";
import HomeIcon from "@mui/icons-material/Home";
import {
  Build,
  FormatListBulletedOutlined,
  ScreenshotMonitor,
  Construction,
  MonitorHeart,
  Plumbing,
  Assessment,
  Science
} from '@mui/icons-material';
import { BackgroundBox, CustomCardHeader } from "../components";

const redirectOptions = [
  { value: "/", label: "Home", icon: <HomeIcon fontSize="small" /> },
  { value: "/workorders", label: "Work Orders", icon: <FormatListBulletedOutlined fontSize="small" /> },
  { value: "/meters", label: "Meter Information", icon: <ScreenshotMonitor fontSize="small" /> },
  { value: "/activities", label: "Activities", icon: <Construction fontSize="small" /> },
  { value: "/wells", label: "Monitoring Wells", icon: <MonitorHeart fontSize="small" /> },
  { value: "/wellmanagement", label: "Manage Wells", icon: <Plumbing fontSize="small" /> },
  { value: "/reports", label: "Reports", icon: <Assessment fontSize="small" /> },
  { value: "/reports/wells", label: "Monitoring Wells Report", icon: <MonitorHeart fontSize="small" /> },
  { value: "/reports/maintenance", label: "Maintenance Report", icon: <Construction fontSize="small" /> },
  { value: "/reports/partsused", label: "Parts Used Report", icon: <Build fontSize="small" /> },
  { value: "/reports/chlorides", label: "Chlorides Report", icon: <Science fontSize="small" /> },
];

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
  const [savedMessage, setSavedMessage] = useState<string>("");

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
    formState: { errors, isValid },
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
        <CustomCardHeader title="Settings" icon={SettingsIcon} />
        <CardContent>
          {/* User Info */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h5" gutterBottom>
              User Information
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography>
                  <b>Full Name:</b> {user?.full_name ?? "N/A"}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography>
                  <b>Email:</b> {user?.email ?? "N/A"}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography>
                  <b>Username:</b> {user?.username ?? "N/A"}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography>
                  <b>Role:</b> {user?.user_role?.name ?? "N/A"}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography>
                  <b>Active:</b> {!user?.disabled ? "Yes" : "No"}
                </Typography>
              </Grid>
            </Grid>
          </Box>

          <Divider sx={{ my: 2 }} />

          <form onSubmit={handleSubmit(onSubmit)}>
            <Typography variant="h5" gutterBottom>
              Preferences
            </Typography>
            <Controller
              name="redirectPage"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  fullWidth
                  label="Page to redirect after login"
                  sx={{ mb: 3, maxWidth: 600 }}
                >
                  {redirectOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <ListItemIcon sx={{ minWidth: 0 }}>{option.icon}</ListItemIcon>
                        <Typography variant="body2">{option.label}</Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />

            <Typography variant="h5" gutterBottom>
              Password Reset
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={3}>
                <Controller
                  name="currentPassword"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      disabled
                      label="Current Password"
                      type="password"
                      fullWidth
                      error={!!errors.currentPassword}
                      helperText={errors.currentPassword?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <Controller
                  name="newPassword"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      disabled
                      label="New Password"
                      type="password"
                      fullWidth
                      error={!!errors.newPassword}
                      helperText={errors.newPassword?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <Controller
                  name="confirmPassword"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      disabled
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
                disabled={!isValid || true}
                sx={{
                  backgroundColor: "darkblue",
                  "&:hover": { backgroundColor: "#00008b" },
                }}
              >
                Save
              </Button>
            </Box>
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

