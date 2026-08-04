import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import dayjs from "dayjs";
import { SoldMetersReportView } from "@/views/Reports/SoldMeters";
import { ProtectedRoute } from "@/ProtectedRoute";
import {
  dayjsDateParam,
  optionalNonNegativeInt,
  pageParam,
  routeSearchHydrator,
} from "@/utils";

const searchSchema = z.object({
  from: dayjsDateParam
    .catch(dayjs().startOf("month").format("YYYY-MM-DD"))
    .default(dayjs().startOf("month").format("YYYY-MM-DD")),
  to: dayjsDateParam
    .catch(dayjs().endOf("month").format("YYYY-MM-DD"))
    .default(dayjs().endOf("month").format("YYYY-MM-DD")),
  min_size: optionalNonNegativeInt,
  max_size: optionalNonNegativeInt,
  page: pageParam(0, 0, 1000),
  pageSize: pageParam(10, 5, 100),
});

export const Route = createFileRoute("/reports/soldmeters")({
  validateSearch: searchSchema,
  beforeLoad: ({ search, location }) =>
    routeSearchHydrator(location.pathname, search, location.searchStr),
  component: () => (
    <ProtectedRoute requiredScopes={["read"]}>
      <SoldMetersReportView />
    </ProtectedRoute>
  ),
});
