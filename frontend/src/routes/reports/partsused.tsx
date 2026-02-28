import { createFileRoute } from "@tanstack/react-router";
import { PartsUsedReportView } from "@/views/Reports/PartsUsed";
import { ProtectedRoute } from "@/ProtectedRoute";

export const Route = createFileRoute("/reports/partsused")({
  component: () => (
    <ProtectedRoute requiredScopes={["read"]}>
      <PartsUsedReportView />
    </ProtectedRoute>
  ),
});
