import { createFileRoute } from "@tanstack/react-router";
import { Notifications } from "@/views";
import { ProtectedRoute } from "@/ProtectedRoute";

export const Route = createFileRoute("/notifications")({
  component: () => (
    <ProtectedRoute requiredScopes={["read"]}>
      <Notifications />
    </ProtectedRoute>
  ),
});
