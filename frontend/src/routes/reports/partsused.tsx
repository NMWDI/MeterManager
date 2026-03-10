import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import dayjs from "dayjs";
import { PartsUsedReportView } from "@/views/Reports/PartsUsed";
import { ProtectedRoute } from "@/ProtectedRoute";
import {
  booleanParam,
  dayjsDateParam,
  pageParam,
  positiveIntListParam,
  routeSearchHydrator,
} from "@/utils";
const searchSchema = z.object({
  from: dayjsDateParam
    .catch(dayjs().startOf("month").format("YYYY-MM-DD"))
    .default(dayjs().startOf("month").format("YYYY-MM-DD")),
  to: dayjsDateParam
    .catch(dayjs().endOf("month").format("YYYY-MM-DD"))
    .default(dayjs().endOf("month").format("YYYY-MM-DD")),
  part_types: positiveIntListParam,
  parts: positiveIntListParam,
  in_use: booleanParam(true),
  page: pageParam(0, 0, 1000),
  pageSize: pageParam(5, 5, 100),
});

export const Route = createFileRoute("/reports/partsused")({
  validateSearch: searchSchema,
  beforeLoad: ({ search, location }) =>
    routeSearchHydrator(location.pathname, search, location.searchStr),
  component: () => (
    <ProtectedRoute requiredScopes={["read"]}>
      <PartsUsedReportView />
    </ProtectedRoute>
  ),
});
