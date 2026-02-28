import { createFileRoute } from "@tanstack/react-router";
import { BackupsView } from "@/views";
import { ProtectedRoute } from "@/ProtectedRoute";

export const Route = createFileRoute("/manage/backups")({
  component: () => (
    <ProtectedRoute requiredScopes={["admin"]}>
      <BackupsView />
    </ProtectedRoute>
  ),
});
