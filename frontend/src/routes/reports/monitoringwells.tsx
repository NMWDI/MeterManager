import { createFileRoute } from "@tanstack/react-router";
import { MonitoringWellsReportView } from "@/views/Reports/MonitoringWells";
import { ProtectedRoute } from "@/ProtectedRoute";

export const Route = createFileRoute("/reports/monitoringwells")({
  component: () => (
    <ProtectedRoute requiredScopes={["read"]}>
      <MonitoringWellsReportView />
    </ProtectedRoute>
  ),
});
