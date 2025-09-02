import { useEffect, useState } from "react";
import { AuthProvider } from "react-auth-kit";
import {
  Route,
  BrowserRouter as Router,
  Routes,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { SnackbarProvider, enqueueSnackbar } from "notistack";
import {
  Home,
  Login,
  Settings,
} from './views'
import { MonitoringWellsView } from "./views/MonitoringWells/MonitoringWellsView";
import { ActivitiesView } from "./views/Activities/ActivitiesView";
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
                    <AppLayout
                      pageComponent={<Home />}
                      requiredScopes={[]}
                      setErrorMessage={setErrorMessage}
                    />
                  }
                />
                <Route path="/login" element={
                  <AppLayout
                    pageComponent={<Login />}
                    requiredScopes={[]}
                    setErrorMessage={setErrorMessage}
                  />
                } />
                <Route
                  path="/settings"
                  element={
                    <AppLayout
                      pageComponent={<Settings />}
                      requiredScopes={["read"]}
                      setErrorMessage={setErrorMessage}
                    />
                  }
                />
                <Route
                  path="/meters"
                  element={
                    <AppLayout
                      pageComponent={<MetersView />}
                      requiredScopes={["read"]}
                      setErrorMessage={setErrorMessage}
                    />
                  }
                />
                <Route
                  path="/activities"
                  element={
                    <AppLayout
                      pageComponent={<ActivitiesView />}
                      requiredScopes={["activities:write"]}
                      setErrorMessage={setErrorMessage}
                    />
                  }
                />
                <Route
                  path="/wells"
                  element={
                    <AppLayout
                      pageComponent={<MonitoringWellsView />}
                      requiredScopes={["read"]}
                      setErrorMessage={setErrorMessage}
                    />
                  }
                />
                <Route
                  path="/reports"
                  element={
                    <AppLayout
                      pageComponent={<ReportsView />}
                      requiredScopes={["read"]}
                      setErrorMessage={setErrorMessage}
                    />
                  }
                />
                <Route
                  path="/reports/workorders"
                  element={
                    <AppLayout
                      pageComponent={<WorkOrdersReportView />}
                      requiredScopes={["read"]}
                      setErrorMessage={setErrorMessage}
                    />
                  }
                />
                <Route
                  path="/reports/wells"
                  element={
                    <AppLayout
                      pageComponent={<MonitoringWellsReportView />}
                      requiredScopes={["read"]}
                      setErrorMessage={setErrorMessage}
                    />
                  }
                />
                <Route
                  path="/reports/maintenance"
                  element={
                    <AppLayout
                      pageComponent={<MaintenanceReportView />}
                      requiredScopes={["read"]}
                      setErrorMessage={setErrorMessage}
                    />
                  }
                />
                <Route
                  path="/reports/partsused"
                  element={
                    <AppLayout
                      pageComponent={<PartsUsedReportView />}
                      requiredScopes={["read"]}
                      setErrorMessage={setErrorMessage}
                    />
                  }
                />
                <Route
                  path="/reports/board"
                  element={
                    <AppLayout
                      pageComponent={<BoardReportView />}
                      requiredScopes={["read"]}
                      setErrorMessage={setErrorMessage}
                    />
                  }
                />
                <Route
                  path="/reports/chlorides"
                  element={
                    <AppLayout
                      pageComponent={<ChloridesReportView />}
                      requiredScopes={["read"]}
                      setErrorMessage={setErrorMessage}
                    />
                  }
                />
                <Route
                  path="/chlorides"
                  element={
                    <AppLayout
                      pageComponent={<ChloridesView />}
                      requiredScopes={["admin"]}
                      setErrorMessage={setErrorMessage}
                    />
                  }
                />
                <Route
                  path="/parts"
                  element={
                    <AppLayout
                      pageComponent={<PartsView />}
                      requiredScopes={["admin"]}
                      setErrorMessage={setErrorMessage}
                    />
                  }
                />
                <Route
                  path="/usermanagement"
                  element={
                    <AppLayout
                      pageComponent={<UserManagementView />}
                      requiredScopes={["admin"]}
                      setErrorMessage={setErrorMessage}
                    />
                  }
                />
                <Route
                  path="/wellmanagement"
                  element={
                    <AppLayout
                      pageComponent={<WellManagementView />}
                      requiredScopes={["read"]}
                      setErrorMessage={setErrorMessage}
                    />
                  }
                />
                <Route
                  path="/workorders"
                  element={
                    <AppLayout
                      pageComponent={<WorkOrdersView />}
                      requiredScopes={["read"]}
                      setErrorMessage={setErrorMessage}
                    />
                  }
                />
                <Route
                  path="*"
                  element={
                    <AppLayout
                      pageComponent={<Home />}
                      requiredScopes={["read"]}
                      setErrorMessage={setErrorMessage}
                    />
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
