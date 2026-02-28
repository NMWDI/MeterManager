import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ActivitiesView } from "@/views";
import { ProtectedRoute } from "@/ProtectedRoute";

const firstValue = (value: unknown) =>
  Array.isArray(value) ? value[0] : value;

// `meter_id` / `work_order_id`:
// - allow `?meter_id=123` or `?meter_id=123&meter_id=456` (takes first)
// - allow numeric strings
// - empty -> undefined
// - invalid -> undefined
const optionalNumber = z.preprocess((val) => {
  const raw = firstValue(val);
  if (raw === undefined || raw === null || raw === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}, z.number().int().positive().optional());

// `serial_number`:
// - allow `?serial_number=ABC` or repeated param (takes first)
// - empty -> undefined
const optionalString = z.preprocess((val) => {
  const raw = firstValue(val);
  if (raw === undefined || raw === null || raw === "") return undefined;
  return typeof raw === "string" ? raw : undefined;
}, z.string().optional());

export const Route = createFileRoute("/activities")({
  validateSearch: z.object({
    meter_id: optionalNumber,
    serial_number: optionalString,
    work_order_id: optionalNumber,
  }),
  component: () => (
    <ProtectedRoute requiredScopes={["activities:write"]}>
      <ActivitiesView />
    </ProtectedRoute>
  ),
});
