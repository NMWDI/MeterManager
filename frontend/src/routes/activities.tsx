import { createFileRoute } from "@tanstack/react-router";
import { ActivitiesView } from "@/views";
import { ProtectedRoute } from "@/ProtectedRoute";

const firstValue = (value: unknown) =>
  Array.isArray(value) ? value[0] : value;

const parseNumber = (value: unknown) => {
  const raw = firstValue(value);
  if (raw === undefined || raw === null || raw === "") return undefined;
  const num = Number(raw);
  return Number.isFinite(num) ? num : undefined;
};

export const Route = createFileRoute("/activities")({
  validateSearch: (search) => ({
    meter_id: parseNumber(search.meter_id),
    serial_number:
      typeof search.serial_number === "string"
        ? search.serial_number
        : undefined,
    work_order_id: parseNumber(search.work_order_id),
  }),
  component: () => (
    <ProtectedRoute requiredScopes={["activities:write"]}>
      <ActivitiesView />
    </ProtectedRoute>
  ),
});
