import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ServiceAccountManagementView } from "@/views";
import { ProtectedRoute } from "@/ProtectedRoute";
import {
  booleanParam,
  optionalPositiveInt,
  pageParam,
  routeSearchHydrator,
  triStateParam,
} from "@/utils";

const searchSchema = z.object({
  service_account_id: optionalPositiveInt.catch(undefined).default(undefined),
  service_account_add: booleanParam(true),
  service_account_q: z.string().catch("").default(""),
  service_account_active: triStateParam("true"),
  sa_page: pageParam(0, 0),
  sa_pageSize: pageParam(10, 10),
});

export const Route = createFileRoute("/manage/serviceaccounts")({
  validateSearch: searchSchema,
  beforeLoad: ({ search, location }) =>
    routeSearchHydrator(location.pathname, search, location.searchStr),
  component: () => (
    <ProtectedRoute requiredScopes={["admin"]}>
      <ServiceAccountManagementView />
    </ProtectedRoute>
  ),
});
