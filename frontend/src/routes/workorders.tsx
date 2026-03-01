import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@mui/material";
import { FormatListBulletedOutlined } from "@mui/icons-material";
import { z } from "zod";

import { WorkOrderStatus } from "@/enums";
import { ProtectedRoute } from "@/ProtectedRoute";
import { BackgroundBox, CustomCardHeader } from "@/components";
import { WorkOrdersTable } from "@/views/WorkOrders";

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

const assignedUserIdSchema = z.preprocess((val) => {
  if (val === undefined || val === null || val === "") return undefined;
  const n = Number(val);
  if (!Number.isInteger(n) || n <= 0) return undefined;
  return n;
}, z.number().int().positive().optional());

const qSchema = z.preprocess((val) => {
  if (val === undefined || val === null) return undefined;
  const s = String(val).trim();
  return s.length ? s : undefined;
}, z.string().optional());

/**
 * Accepts:
 *  - ?work_order_id=1,2,3
 *  - ?work_order_id=1&work_order_id=2
 *  - any mix of the above
 *  - or undefined
 */
const numberListSchema = z.preprocess((val) => {
  if (val === undefined || val === null || val === "") return undefined;

  const raw = Array.isArray(val) ? val : [val];

  const nums = raw
    .flatMap((v) => (typeof v === "string" ? v.split(",") : [v]))
    .map((v) => String(v).trim())
    .filter(Boolean)
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n));

  return nums.length ? nums : undefined;
}, z.array(z.number().int().positive()).optional());

export const Route = createFileRoute("/workorders")({
  validateSearch: z.object({
    status: statusListSchema
      .catch([WorkOrderStatus.Open, WorkOrderStatus.Review])
      .default([WorkOrderStatus.Open, WorkOrderStatus.Review]),
    assigned_user_id: assignedUserIdSchema, // no default -> stays undefined when not set
    q: qSchema, // no default -> stays undefined when not set
    work_order_id: numberListSchema,
    page: z.coerce.number().int().min(0).catch(0),
    pageSize: z.coerce.number().int().min(10).max(200).catch(25),
  }),
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
          icon={FormatListBulletedOutlined}
        />
        <CardContent>
          <WorkOrdersTable />
        </CardContent>
      </Card>
    </BackgroundBox>
  );
}
