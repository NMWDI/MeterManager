import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { Settings } from "@/views";
import { ProtectedRoute } from "@/ProtectedRoute";
import { booleanParam, routeSearchHydrator } from "@/utils";

const searchSchema = z.object({
  showClosedSessions: booleanParam(false),
});

export const Route = createFileRoute("/settings")({
  validateSearch: searchSchema,
  beforeLoad: ({ search, location }) =>
    routeSearchHydrator(location.pathname, search, location.searchStr),
  component: () => (
    <ProtectedRoute requiredScopes={["read"]}>
      <Settings />
    </ProtectedRoute>
  ),
});
