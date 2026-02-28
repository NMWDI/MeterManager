import { createFileRoute } from "@tanstack/react-router";
import { WellManagementView } from "@/views";
import { ProtectedRoute } from "@/ProtectedRoute";

export const Route = createFileRoute("/manage/wells")({
  component: () => (
    <ProtectedRoute requiredScopes={["read"]}>
      <WellManagementView />
    </ProtectedRoute>
  ),
});
