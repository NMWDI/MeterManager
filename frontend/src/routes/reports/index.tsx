import { createFileRoute } from "@tanstack/react-router";
import { ReportsView } from "@/views";
import { ProtectedRoute } from "@/ProtectedRoute";

export const Route = createFileRoute("/reports/")({
  component: () => (
    <ProtectedRoute requiredScopes={["read"]}>
      <ReportsView />
    </ProtectedRoute>
  ),
});
