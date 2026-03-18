import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@mui/material";
import { AssignmentTurnedInOutlined } from "@mui/icons-material";
import { z } from "zod";

import { WorkOrderStatus } from "@/enums";
import { ProtectedRoute } from "@/ProtectedRoute";
import { BackgroundBox, CustomCardHeader } from "@/components";
import { WorkOrdersTable } from "@/views/WorkOrders";
import {
  optionalPositiveInt,
  optionalTrimmedString,
  pageParam,
  positiveIntListParam,
  routeSearchHydrator,
} from "@/utils";

const statusEnum = z.nativeEnum(WorkOrderStatus);
export type WorkOrderStatusParam = z.infer<typeof statusEnum>;

/**
 * Accepts:
 *    - ?status=Open&status=Review
 *    - ?status=Open,Review
 *    - or undefined
 */
const statusListSchema = z.preprocess((val) => {
  if (val === undefined || val === null || val === "") return undefined;

  const raw = Array.isArray(val) ? val : [val];

  const items = raw
    .flatMap((v) => (typeof v === "string" ? v.split(",") : [v]))
    .map((v) => String(v).trim())
    .filter(Boolean);

  return items.length ? items : undefined;
}, z.array(statusEnum).optional());
const searchSchema = z.object({
  status: statusListSchema
    .catch([WorkOrderStatus.Open, WorkOrderStatus.Review])
    .default([WorkOrderStatus.Open, WorkOrderStatus.Review]),
  assigned_user_id: optionalPositiveInt.catch(undefined).default(undefined),
  q: optionalTrimmedString.catch("").default(""),
  work_order_id: positiveIntListParam,
  page: pageParam(0, 0),
  pageSize: pageParam(25, 10),
});

export const Route = createFileRoute("/workorders")({
  validateSearch: searchSchema,
  beforeLoad: ({ search, location }) =>
    routeSearchHydrator(location.pathname, search, location.searchStr),
  component: () => (
    <ProtectedRoute requiredScopes={["read"]}>
      <WorkOrdersView />
    </ProtectedRoute>
  ),
});

function WorkOrdersView() {
  return (
    <BackgroundBox>
      <Card sx={{ height: "fit-content", overflowX: "auto" }}>
        <CustomCardHeader
          title="Work Orders"
          icon={AssignmentTurnedInOutlined}
        />
        <CardContent>
          <WorkOrdersTable />
        </CardContent>
      </Card>
    </BackgroundBox>
  );
}
