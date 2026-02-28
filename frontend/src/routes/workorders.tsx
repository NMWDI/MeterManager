import { createFileRoute } from "@tanstack/react-router";
import { WorkOrdersView } from "@/views";
import { ProtectedRoute } from "@/ProtectedRoute";

const parseNumberList = (value: unknown): number[] | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  const raw = Array.isArray(value) ? value : [value];
  const numbers = raw
    .flatMap((v) => (typeof v === "string" ? v.split(",") : [v]))
    .map((v) => String(v).trim())
    .filter(Boolean)
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n) && n > 0);
  return numbers.length ? numbers : undefined;
};

export const Route = createFileRoute("/workorders")({
  validateSearch: (search) => ({
    work_order_id: parseNumberList(search.work_order_id),
  }),
  component: () => (
    <ProtectedRoute requiredScopes={["read"]}>
      <WorkOrdersView />
    </ProtectedRoute>
  ),
});
