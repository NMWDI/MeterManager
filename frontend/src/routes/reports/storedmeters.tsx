import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { StoredMetersReportView } from "@/views/Reports/StoredMeters";
import { ProtectedRoute } from "@/ProtectedRoute";
import {
  optionalNonNegativeInt,
  pageParam,
  routeSearchHydrator,
} from "@/utils";

const searchSchema = z.object({
  min_size: optionalNonNegativeInt,
  max_size: optionalNonNegativeInt,
  page: pageParam(0, 0, 1000),
  pageSize: pageParam(10, 5, 100),
});

export const Route = createFileRoute("/reports/storedmeters")({
  validateSearch: searchSchema,
  beforeLoad: ({ search, location }) =>
    routeSearchHydrator(location.pathname, search, location.searchStr),
  component: () => (
    <ProtectedRoute requiredScopes={["read"]}>
      <StoredMetersReportView />
    </ProtectedRoute>
  ),
});
