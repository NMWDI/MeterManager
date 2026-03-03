import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { UserManagementView } from "@/views";
import { ProtectedRoute } from "@/ProtectedRoute";

const tri = z.enum(["all", "true", "false"]).catch("all");

export const Route = createFileRoute("/manage/users")({
  validateSearch: z.object({
    user_id: z.number().optional(),
    user_add: z.boolean().catch(true).default(true),
    user_q: z.string().optional().default(""),
    active: tri.default("true"),
    tech: tri.default("all"),

    role_id: z.number().optional(),
    role_add: z.boolean().catch(true).default(true),
    role_q: z.string().optional().default(""),
  }),
  component: () => (
    <ProtectedRoute requiredScopes={["admin"]}>
      <UserManagementView />
    </ProtectedRoute>
  ),
});
