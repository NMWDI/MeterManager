import { createFileRoute } from "@tanstack/react-router";
import { UserManagementView } from "@/views";
import { ProtectedRoute } from "@/ProtectedRoute";

export const Route = createFileRoute("/manage/users")({
  component: () => (
    <ProtectedRoute requiredScopes={["admin"]}>
      <UserManagementView />
    </ProtectedRoute>
  ),
});
