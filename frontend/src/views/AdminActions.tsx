import { useState } from "react";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import { AdminPanelSettingsOutlined, Backup, Sync } from "@mui/icons-material";
import { BackgroundBox, CustomCardHeader } from "@/components";
import { useCreateDatabaseBackup, useRunOSEOwnerSync } from "@/service";

export const AdminActions = () => {
  const runOSEOwnerSync = useRunOSEOwnerSync();
  const createDatabaseBackup = useCreateDatabaseBackup();
  const [oseSyncWarningAcknowledged, setOSESyncWarningAcknowledged] =
    useState(false);

  return (
    <BackgroundBox>
      <Card sx={{ height: "fit-content" }}>
        <CustomCardHeader
          title="Admin Actions"
          icon={AdminPanelSettingsOutlined}
        />
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="h6">OSE Owner Sync</Typography>
                  <Typography color="text.secondary">
                    Fetch OSE meter owner/contact data and create owner-change
                    notifications for admin review.
                  </Typography>
                </Box>
                <Alert
                  severity="warning"
                  action={
                    <Button
                      color="inherit"
                      size="small"
                      disabled={
                        oseSyncWarningAcknowledged ||
                        runOSEOwnerSync.isLoading
                      }
                      onClick={() => setOSESyncWarningAcknowledged(true)}
                    >
                      {oseSyncWarningAcknowledged
                        ? "Acknowledged"
                        : "Acknowledge"}
                    </Button>
                  }
                >
                  <AlertTitle>Review Before Running</AlertTitle>
                  OSE owner sync is an expensive operation that takes several
                  minutes to complete. Do not change pages or close this tab
                  while the sync is running.
                </Alert>
                <Alert severity="info">
                  <AlertTitle>Recommended Schedule</AlertTitle>
                  Run OSE owner sync once per month, preferably at the beginning
                  of the month.
                </Alert>
                <Box>
                  <Button
                    variant="contained"
                    startIcon={
                      runOSEOwnerSync.isLoading ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : (
                        <Sync />
                      )
                    }
                    disabled={
                      runOSEOwnerSync.isLoading ||
                      !oseSyncWarningAcknowledged
                    }
                    onClick={() => runOSEOwnerSync.mutate()}
                  >
                    {runOSEOwnerSync.isLoading
                      ? "Running Sync"
                      : "Run OSE Sync"}
                  </Button>
                </Box>
                {runOSEOwnerSync.data ? (
                  <Alert severity="success">
                    <AlertTitle>Sync Complete</AlertTitle>
                    Fetched {runOSEOwnerSync.data.fetched_count}, matched{" "}
                    {runOSEOwnerSync.data.matched_count}, found{" "}
                    {runOSEOwnerSync.data.changed_count} changes, created{" "}
                    {runOSEOwnerSync.data.created_request_count} requests and{" "}
                    {runOSEOwnerSync.data.notification_count} notifications.
                  </Alert>
                ) : null}
              </Stack>
            </Grid>
            <Grid item xs={12} md={6}>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="h6">Database Backup</Typography>
                  <Typography color="text.secondary">
                    Create a database backup and upload it to the configured
                    backup bucket.
                  </Typography>
                </Box>
                <Alert severity="info">
                  <AlertTitle>Review Before Running</AlertTitle>
                  Automatic production database backups are performed daily.
                  Test database backups are performed weekly. Use this action if
                  you require an additional on-demand backup.
                </Alert>
                <Box>
                  <Button
                    variant="contained"
                    startIcon={
                      createDatabaseBackup.isLoading ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : (
                        <Backup />
                      )
                    }
                    disabled={createDatabaseBackup.isLoading}
                    onClick={() => createDatabaseBackup.mutate()}
                  >
                    {createDatabaseBackup.isLoading
                      ? "Creating Backup"
                      : "Create Backup"}
                  </Button>
                </Box>
                {createDatabaseBackup.data ? (
                  <Alert severity="success">
                    <AlertTitle>Backup Complete</AlertTitle>
                    {createDatabaseBackup.data.status}
                  </Alert>
                ) : null}
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </BackgroundBox>
  );
};
