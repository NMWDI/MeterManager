import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import dayjs from "dayjs";
import { MaintenanceReportView } from "@/views/Reports/Maintenance";
import { ProtectedRoute } from "@/ProtectedRoute";
import {
  isoDateParam,
  optionalNonNegativeInt,
  optionalTrimmedString,
  positiveIntListParam,
  routeSearchHydrator,
} from "@/utils";

const pageSizeSchema = z.preprocess((val) => {
  const raw = Array.isArray(val) ? val[0] : val;
  if (raw == null || raw === "") return undefined;
  const n = Number(raw);
  const allowed = new Set([5, 10, 25, 50, 100]);
  return Number.isInteger(n) && allowed.has(n) ? n : undefined;
}, z.number().int().optional()).catch(5).default(5);

const searchSchema = z.object({
  from: isoDateParam
    .catch(dayjs().startOf("month").format("YYYY-MM-DD"))
    .default(dayjs().startOf("month").format("YYYY-MM-DD")),
  to: isoDateParam
    .catch(dayjs().endOf("month").format("YYYY-MM-DD"))
    .default(dayjs().endOf("month").format("YYYY-MM-DD")),
  trss: optionalTrimmedString.catch("").default(""),
  technicians: positiveIntListParam,
  page: optionalNonNegativeInt.catch(0).default(0),
  pageSize: pageSizeSchema,
});

export const Route = createFileRoute("/reports/maintenance")({
  validateSearch: searchSchema,
  beforeLoad: ({ search, location }) =>
    routeSearchHydrator(location.pathname, search, location.searchStr),
  component: () => (
    <ProtectedRoute requiredScopes={["read"]}>
      <MaintenanceReportView />
    </ProtectedRoute>
  ),
});
