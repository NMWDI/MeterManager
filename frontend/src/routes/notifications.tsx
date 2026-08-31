import { createFileRoute } from "@tanstack/react-router";
import dayjs from "dayjs";
import { z } from "zod";
import { Notifications } from "@/views";
import { ProtectedRoute } from "@/ProtectedRoute";
import {
  isoDateParam,
  pageParam,
  positiveIntListParam,
  routeSearchHydrator,
  triStateParam,
} from "@/utils";

const searchSchema = z.object({
  q: z.string().catch("").default(""),
  is_read: triStateParam("false"),
  notification_type_id: positiveIntListParam,
  created_from: isoDateParam.catch(undefined).default(undefined),
  created_to: isoDateParam
    .catch(dayjs().endOf("month").format("YYYY-MM-DD"))
    .default(dayjs().endOf("month").format("YYYY-MM-DD")),
  owner_change_request_id: z.coerce.number().int().positive().optional(),
  page: pageParam(0, 0),
  pageSize: pageParam(25, 10),
});

export const Route = createFileRoute("/notifications")({
  validateSearch: searchSchema,
  beforeLoad: ({ search, location }) =>
    routeSearchHydrator(location.pathname, search, location.searchStr),
  component: () => (
    <ProtectedRoute requiredScopes={["read"]}>
      <Notifications />
    </ProtectedRoute>
  ),
});
