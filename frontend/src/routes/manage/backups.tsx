import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { BackupsView } from "@/views";
import { ProtectedRoute } from "@/ProtectedRoute";
import { pageParam, routeSearchHydrator } from "@/utils";

const searchSchema = z.object({
  page: pageParam(0, 0),
  pageSize: pageParam(25, 10),
});

export const Route = createFileRoute("/manage/backups")({
  validateSearch: searchSchema,
  beforeLoad: ({ search, location }) =>
    routeSearchHydrator(location.pathname, search, location.searchStr),
  component: () => (
    <ProtectedRoute requiredScopes={["admin"]}>
      <BackupsView />
    </ProtectedRoute>
  ),
});
