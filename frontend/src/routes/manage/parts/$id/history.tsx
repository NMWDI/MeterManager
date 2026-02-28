import { createFileRoute } from "@tanstack/react-router";
import { PartsHistory } from "@/views";
import { ProtectedRoute } from "@/ProtectedRoute";

export const Route = createFileRoute("/manage/parts/$id/history")({
  component: () => (
    <ProtectedRoute requiredScopes={["admin"]}>
      <PartsHistory />
    </ProtectedRoute>
  ),
});
