import { createFileRoute } from "@tanstack/react-router";
import { ManageView } from "@/views";
import { ProtectedRoute } from "@/ProtectedRoute";

export const Route = createFileRoute("/manage/")({
  component: () => (
    <ProtectedRoute>
      <ManageView />
    </ProtectedRoute>
  ),
});
