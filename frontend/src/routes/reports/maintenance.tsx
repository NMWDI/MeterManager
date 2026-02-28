import { createFileRoute } from "@tanstack/react-router";
import { MaintenanceReportView } from "@/views/Reports/Maintenance";
import { ProtectedRoute } from "@/ProtectedRoute";

export const Route = createFileRoute("/reports/maintenance")({
  component: () => (
    <ProtectedRoute requiredScopes={["read"]}>
      <MaintenanceReportView />
    </ProtectedRoute>
  ),
});
