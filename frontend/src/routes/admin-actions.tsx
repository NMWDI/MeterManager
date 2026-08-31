import { createFileRoute } from "@tanstack/react-router";
import { AdminActions } from "@/views/AdminActions";
import { ProtectedRoute } from "@/ProtectedRoute";

export const Route = createFileRoute("/admin-actions")({
  component: () => (
    <ProtectedRoute requiredScopes={["admin"]}>
      <AdminActions />
    </ProtectedRoute>
  ),
});
