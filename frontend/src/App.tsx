import { useEffect, useRef, useState } from "react";
import { AuthProvider, useAuthUser } from "react-auth-kit";
import {
  Route,
  BrowserRouter as Router,
  Routes,
  useNavigate,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { SnackbarProvider, enqueueSnackbar } from "notistack";
import { Box } from "@mui/material";
import { MonitoringWellsView } from "./views/MonitoringWells/MonitoringWellsView";
import { ActivitiesView } from "./views/Activities/ActivitiesView";
import { MetersView } from "./views/Meters/MetersView";
import { PartsView } from "./views/Parts/PartsView";
import { UserManagementView } from "./views/UserManagement/UserManagementView";
import WellManagementView from "./views/WellManagement/WellManagementView";
import WorkOrdersView from "./views/WorkOrders/WorkOrdersView";
import Sidenav from "./sidenav";
import { Home } from "./Home";
import Topbar from "./components/Topbar";
import Login from "./login";
import { SecurityScope } from "./interfaces";
import { ChloridesView } from "./views/Chlorides/ChloridesView";
import { ReportsView } from "./views/Reports";
import { WorkOrdersReportView } from "./views/Reports/WorkOrders";
import { MonitoringWellsReportView } from "./views/Reports/MonitoringWells";
import { RepairsReportView } from "./views/Reports/Repairs";
import { PartsUsedReportView } from "./views/Reports/PartsUsed";
import { BoardReportView } from "./views/Reports/Board";
import { ChloridesReportView } from "./views/Reports/Chlorides";

// A wrapper that handles checking that the user is logged in and has any necessary scopes
const AppLayout = ({
  pageComponent,
  requiredScopes = null,
  setErrorMessage = null,
}: any) => {
  const authUser = useAuthUser();
  const navigate = useNavigate();

  const isLoggedIn = authUser() != null;
  const userScopes = authUser()?.user_role?.security_scopes?.map(
    (scope: SecurityScope) => scope.scope_string,
  );
  const hasScopes =
    requiredScopes == null
      ? true
      : requiredScopes?.every((scope: string) => userScopes?.includes(scope));

  useEffect(() => {
    if (!isLoggedIn) {
      if (setErrorMessage) setErrorMessage("You must login to view pages.");
      navigate("/");
    } else if (!hasScopes) {
      if (setErrorMessage)
        setErrorMessage(
          "You do not have sufficient permissions to view this page.",
        );
      navigate("/home");
    }
  }, [authUser()]);

  const topbarRef = useRef<HTMLDivElement>(null);
  const sidenavRef = useRef<HTMLDivElement>(null);

  const [topbarHeight, setTopbarHeight] = useState(0);
  const [sidenavWidth, setSidenavWidth] = useState(0);

  // Resize observer for topbar height
  useEffect(() => {
    if (!topbarRef.current) return;

    const observer = new ResizeObserver(() => {
      setTopbarHeight(topbarRef.current!.offsetHeight);
    });

    observer.observe(topbarRef.current);

    return () => observer.disconnect();
  }, []);

  // Resize observer for sidenav width
  useEffect(() => {
    if (!sidenavRef.current) return;

    const observer = new ResizeObserver(() => {
      setSidenavWidth(sidenavRef.current!.offsetWidth);
    });

    observer.observe(sidenavRef.current);

    return () => observer.disconnect();
  }, []);

  if (isLoggedIn && hasScopes)
    return (
      <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
        <Box ref={topbarRef} sx={{ flexShrink: 0, zIndex: 10 }}>
          <Topbar />
          <Box
            sx={{
              position: "absolute",
              top: topbarHeight - 2, // Adjusts the border to align at the bottom
              left: `${sidenavWidth}px`, // Dynamically offset from sidenav
              right: 0,
              height: "2px",
              backgroundColor: "rgba(0,0,0,0.2)",
            }}
          />
        </Box>
        <Box sx={{ display: "flex", flexGrow: 1, overflow: "hidden" }}>
          <Box
            ref={sidenavRef}
            sx={{
              minWidth: "15rem",
              maxWidth: "20rem",
              flexShrink: 0,
              height: "100%",
              position: "sticky",
              top: 0,
              overflowY: "hidden",
              borderRight: "2px solid rgba(0,0,0,0.2)",
              backgroundColor: "#fff",
              zIndex: 1,
            }}
          >
            <Sidenav />
          </Box>
          <Box
            sx={{
              flexGrow: 1,
              height: "100%",
              overflowY: "auto",
              p: 3,
            }}
          >
            {pageComponent}
          </Box>
        </Box>
      </Box>
    );
  return null;
};

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
                <Route path="/" element={<Login />} />
                <Route
                  path="/home"
                  element={
                    <AppLayout
                      pageComponent={<Home />}
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
                  path="/reports/repairs"
                  element={
                    <AppLayout
                      pageComponent={<RepairsReportView />}
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
