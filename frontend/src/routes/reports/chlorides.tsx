import { createFileRoute } from "@tanstack/react-router";
import { ChloridesReportView } from "@/views/Reports/Chlorides";
import { ProtectedRoute } from "@/ProtectedRoute";

export const Route = createFileRoute("/reports/chlorides")({
  component: () => (
    <ProtectedRoute requiredScopes={["read"]}>
      <ChloridesReportView />
    </ProtectedRoute>
  ),
});
