import * as yup from 'yup';
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm, Controller } from "react-hook-form";
import {
  Card,
  CardContent,
  Divider,
  Typography,
  Box,
  // Button,
  MenuItem,
  TextField,
  Grid,
  Alert,
  ListItemIcon,
  Chip,
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

const RoleChip = ({ role }: { role: string }) => {
  switch (role) {
    case "Admin": {
      return <Chip size="small" label="Admin" color="primary" />;
    }
    case "Technician": {
      return <Chip size="small" label="Technician" color="secondary" />;
    }
    default: {
      return <Chip size="small" label={role} color="warning" />;
    }
  }
}

const IsActiveChip = ({ active }: { active: boolean }) => {
  return active ? (
    <Chip variant="outlined" size="small" label="True" color="success" />
  ) : (
    <Chip variant="outlined" size="small" label="False" color="error" />
  );
}

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
        <CustomCardHeader title="Settings" icon={SettingsIcon} />
        <CardContent>
          {/* User Info */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h5" gutterBottom>
              User Information
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} lg={4}>
                <Typography>
                  <b>Full Name:</b>{" "}
                  <Box
                    component="span"
                    sx={{
                      fontFamily: "monospace",
                      px: 1,
                      py: 0.5,
                      borderRadius: 3,
                      border: '1px solid black'
                    }}
                  >
                    {user?.full_name ?? "N/A"}
                  </Box>
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} lg={4}>
                <Typography>
                  <b>Email:</b>{" "}
                  <Box
                    component="span"
                    sx={{
                      fontFamily: "monospace",
                      px: 1,
                      py: 0.5,
                      borderRadius: 3,
                      border: '1px solid black'
                    }}
                  >
                    {user?.email ?? "N/A"}
                  </Box>
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} lg={4}>
                <Typography>
                  <b>Username:</b>{" "}
                  <Box
                    component="span"
                    sx={{
                      fontFamily: "monospace",
                      px: 1,
                      py: 0.5,
                      borderRadius: 3,
                      border: '1px solid black'
                    }}
                  >
                    {user?.username ?? "N/A"}
                  </Box>
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} lg={4} sx={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <Typography>
                  <b>Role:</b>
                </Typography>
                <RoleChip role={user?.user_role?.name ?? "N/A"} />
              </Grid>
              <Grid item xs={12} sm={6} lg={4} sx={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <Typography>
                  <b>Active:</b>
                </Typography>
                <IsActiveChip active={!user?.disabled} />
              </Grid>
            </Grid>
          </Box>
          <Divider sx={{ my: 2 }} />
          <form onSubmit={handleSubmit(onSubmit)}>
            <Typography variant="h5" gutterBottom py={2}>
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

