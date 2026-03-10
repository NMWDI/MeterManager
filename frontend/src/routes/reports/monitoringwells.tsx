import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import dayjs from "dayjs";

import { MonitoringWellsReportView } from "@/views/Reports/MonitoringWells";
import { ProtectedRoute } from "@/ProtectedRoute";
import {
  booleanParam,
  dayjsDateParam,
  optionalPositiveInt,
  pageParam,
  positiveIntListParam,
  routeSearchHydrator,
} from "@/utils";

const searchSchema = z.object({
  // form fields
  from: dayjsDateParam
    .catch(dayjs().startOf("month").format("YYYY-MM-DD"))
    .default(dayjs().startOf("month").format("YYYY-MM-DD")),
  to: dayjsDateParam
    .catch(dayjs().endOf("month").format("YYYY-MM-DD"))
    .default(dayjs().endOf("month").format("YYYY-MM-DD")),
  well_ids: positiveIntListParam,

  avgAll: booleanParam(false),
  cmp1970: booleanParam(false),
  cmpYear: optionalPositiveInt.catch(undefined).default(undefined),

  // manual measurements DataGrid pagination
  m_page: pageParam(0, 0, 500),
  m_pageSize: pageParam(5, 5, 50),

  // averages DataGrid pagination
  a_page: pageParam(0, 0, 500),
  a_pageSize: pageParam(5, 5, 50),
});

export const Route = createFileRoute("/reports/monitoringwells")({
  validateSearch: searchSchema,
  beforeLoad: ({ search, location }) =>
    routeSearchHydrator(location.pathname, search, location.searchStr),
  component: () => (
    <ProtectedRoute requiredScopes={["read"]}>
      <MonitoringWellsReportView />
    </ProtectedRoute>
  ),
});
