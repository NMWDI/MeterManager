import { useEffect, useState } from "react";
import { AuthProvider } from "react-auth-kit";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { SnackbarProvider, enqueueSnackbar } from "notistack";

import {


  ActivitiesView,
  MonitoringWellsView,
  BackupsView,
  Home,
  Login,
  Settings,
  NotFound
} from "./views";
import { ActivityPhotoView } from "./views/Activities/ActivityPhotoView";
import { MetersView } from "./views/Meters/MetersView";
import { PartsView } from "./views/Parts/PartsView";
import { UserManagementView } from "./views/UserManagement/UserManagementView";
import WellManagementView from "./views/WellManagement/WellManagementView";
import WorkOrdersView from "./views/WorkOrders/WorkOrdersView";
import { ChloridesView } from "./views/Chlorides/ChloridesView";
import { ReportsView } from "./views/Reports";
import { WorkOrdersReportView } from "./views/Reports/WorkOrders";
import { MonitoringWellsReportView } from "./views/Reports/MonitoringWells";
import { MaintenanceReportView } from "./views/Reports/Maintenance";
import { PartsUsedReportView } from "./views/Reports/PartsUsed";
import { BoardReportView } from "./views/Reports/Board";
import { ChloridesReportView } from "./views/Reports/Chlorides";

import { AppLayout } from "./AppLayout";
import { ProtectedRoute } from "./ProtectedRoute";

export const App = () => {
  const queryClient = new QueryClient();

  // Showing messages between navigation (eg: accessing forbidden page, accessing while not logged in) results in duplicated snackbars, this is a workaround
  const [errorMessage, setErrorMessage] = useState<string>();
  useEffect(() => {
    if (errorMessage) {
      enqueueSnackbar(errorMessage, { variant: "error" });
    }
  }, [errorMessage]);

  return (
    <QueryClientProvider client={queryClient}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <SnackbarProvider
          anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
          maxSnack={10}
        >
          <AuthProvider
            authType={"localstorage"}
            authName={"_auth"}
            cookieDomain={window.location.hostname}
            cookieSecure={window.location.protocol === "https:"}
          >
            <Router>
              <Routes>
                <Route
                  path="/"
                  element={
                    <AppLayout>
                      <Home />
                    </AppLayout>
                  }
                />
                <Route
                  path="/monitoringwells"
                  element={
                    <AppLayout>
                      <MonitoringWellsView />
                    </AppLayout>
                  }
                />
                <Route
                  path="/chlorides"
                  element={
                    <AppLayout>
                      <ChloridesView />
                    </AppLayout>
                  }
                />
                <Route
                  path="/login"
                  element={
                    <AppLayout>
                      <Login />
                    </AppLayout>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute
                      requiredScopes={["read"]}
                      setErrorMessage={setErrorMessage}
                    >
                      <AppLayout>
                        <Settings />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/workorders"
                  element={
                    <ProtectedRoute
                      requiredScopes={["read"]}
                      setErrorMessage={setErrorMessage}
                    >
                      <AppLayout>
                        <WorkOrdersView />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/activities"
                  element={
                    <ProtectedRoute
                      requiredScopes={["activities:write"]}
                      setErrorMessage={setErrorMessage}
                    >
                      <AppLayout>
                        <ActivitiesView />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/activities/:activity_id/photos/:photo_file_name"
                  element={
                    <ProtectedRoute
                      requiredScopes={["read"]}
                      setErrorMessage={setErrorMessage}
                    >
                      <AppLayout>
                        <ActivityPhotoView />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/manage/meters"
                  element={
                    <ProtectedRoute
                      requiredScopes={["read"]}
                      setErrorMessage={setErrorMessage}
                    >
                      <AppLayout>
                        <MetersView />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/manage/wells"
                  element={
                    <ProtectedRoute
                      requiredScopes={["read"]}
                      setErrorMessage={setErrorMessage}
                    >
                      <AppLayout>
                        <WellManagementView />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/reports"
                  element={
                    <ProtectedRoute
                      requiredScopes={["read"]}
                      setErrorMessage={setErrorMessage}
                    >
                      <AppLayout>
                        <ReportsView />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/reports/workorders"
                  element={
                    <ProtectedRoute
                      requiredScopes={["read"]}
                      setErrorMessage={setErrorMessage}
                    >
                      <AppLayout>
                        <WorkOrdersReportView />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/reports/monitoringwells"
                  element={
                    <ProtectedRoute
                      requiredScopes={["read"]}
                      setErrorMessage={setErrorMessage}
                    >
                      <AppLayout>
                        <MonitoringWellsReportView />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/reports/maintenance"
                  element={
                    <ProtectedRoute
                      requiredScopes={["read"]}
                      setErrorMessage={setErrorMessage}
                    >
                      <AppLayout>
                        <MaintenanceReportView />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/reports/partsused"
                  element={
                    <ProtectedRoute
                      requiredScopes={["read"]}
                      setErrorMessage={setErrorMessage}
                    >
                      <AppLayout>
                        <PartsUsedReportView />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/reports/board"
                  element={
                    <ProtectedRoute
                      requiredScopes={["read"]}
                      setErrorMessage={setErrorMessage}
                    >
                      <AppLayout>
                        <BoardReportView />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/reports/chlorides"
                  element={
                    <ProtectedRoute
                      requiredScopes={["read"]}
                      setErrorMessage={setErrorMessage}
                    >
                      <AppLayout>
                        <ChloridesReportView />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/manage/parts"
                  element={
                    <ProtectedRoute
                      requiredScopes={["admin"]}
                      setErrorMessage={setErrorMessage}
                    >
                      <AppLayout>
                        <PartsView />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/manage/users"
                  element={
                    <ProtectedRoute
                      requiredScopes={["admin"]}
                      setErrorMessage={setErrorMessage}
                    >
                      <AppLayout>
                        <UserManagementView />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/manage/backups"
                  element={
                    <ProtectedRoute
                      requiredScopes={["admin"]}
                      setErrorMessage={setErrorMessage}
                    >
                      <AppLayout>
                        <BackupsView />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="*"
                  element={
                    <AppLayout>
                      <NotFound />
                    </AppLayout>
                  }
                />
              </Routes>
            </Router>
          </AuthProvider>
        </SnackbarProvider>
      </LocalizationProvider>
    </QueryClientProvider>
  );
};
