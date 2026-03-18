import { createFileRoute } from "@tanstack/react-router";
import { ActivityPhotoView } from "@/views";
import { ProtectedRoute } from "@/ProtectedRoute";

export const Route = createFileRoute(
  "/activities/$activity_id/photos/$photo_file_name",
)({
  component: () => (
    <ProtectedRoute requiredScopes={["read"]}>
      <ActivityPhotoView />
    </ProtectedRoute>
  ),
});
