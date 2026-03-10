import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { UserManagementView } from "@/views";
import { ProtectedRoute } from "@/ProtectedRoute";
import {
  booleanParam,
  optionalPositiveInt,
  pageParam,
  routeSearchHydrator,
  triStateParam,
} from "@/utils";

const searchSchema = z.object({
  user_id: optionalPositiveInt.catch(undefined).default(undefined),
  user_add: booleanParam(true),
  user_q: z.string().catch("").default(""),
  active: triStateParam("true"),
  tech: triStateParam("all"),
  u_page: pageParam(0, 0),
  u_pageSize: pageParam(25, 10),

  role_id: optionalPositiveInt.catch(undefined).default(undefined),
  role_add: booleanParam(true),
  role_q: z.string().catch("").default(""),
  r_page: pageParam(0, 0),
  r_pageSize: pageParam(25, 10),
});

export const Route = createFileRoute("/manage/users")({
  validateSearch: searchSchema,
  beforeLoad: ({ search, location }) =>
    routeSearchHydrator(location.pathname, search, location.searchStr),
  component: () => (
    <ProtectedRoute requiredScopes={["admin"]}>
      <UserManagementView />
    </ProtectedRoute>
  ),
});
