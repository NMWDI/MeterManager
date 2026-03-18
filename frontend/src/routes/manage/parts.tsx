import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ProtectedRoute } from "@/ProtectedRoute";

export const Route = createFileRoute("/manage/parts")({
  component: () => (
    <ProtectedRoute requiredScopes={["admin"]}>
      <Outlet />
    </ProtectedRoute>
  ),
});
