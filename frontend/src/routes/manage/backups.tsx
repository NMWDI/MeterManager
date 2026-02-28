import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { BackupsView } from "@/views";
import { ProtectedRoute } from "@/ProtectedRoute";

export const Route = createFileRoute("/manage/backups")({
  validateSearch: z.object({
    page: z.coerce.number().int().min(0).catch(0),
    pageSize: z.coerce.number().int().min(10).max(200).catch(25),
  }),
  component: () => (
    <ProtectedRoute requiredScopes={["admin"]}>
      <BackupsView />
    </ProtectedRoute>
  ),
});
