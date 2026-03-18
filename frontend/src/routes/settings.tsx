import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "@/views";
import { ProtectedRoute } from "@/ProtectedRoute";

export const Route = createFileRoute("/settings")({
  component: () => (
    <ProtectedRoute requiredScopes={["read"]}>
      <Settings />
    </ProtectedRoute>
  ),
});
