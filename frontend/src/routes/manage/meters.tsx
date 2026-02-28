import { createFileRoute } from "@tanstack/react-router";
import { MetersView } from "@/views";
import { ProtectedRoute } from "@/ProtectedRoute";

const firstValue = (value: unknown) =>
  Array.isArray(value) ? value[0] : value;

const parseNumber = (value: unknown) => {
  const raw = firstValue(value);
  if (raw === undefined || raw === null || raw === "") return undefined;
  const num = Number(raw);
  return Number.isFinite(num) ? num : undefined;
};

const parseBoolean = (value: unknown) => {
  const raw = firstValue(value);
  if (raw === true || raw === "true") return true;
  if (raw === false || raw === "false") return false;
  return undefined;
};

const parseStringArray = (value: unknown) => {
  if (Array.isArray(value)) {
    return value.filter((v) => typeof v === "string") as string[];
  }
  if (typeof value === "string" && value.length > 0) {
    return value.split(",").map((v) => v.trim()).filter(Boolean);
  }
  return undefined;
};

export const Route = createFileRoute("/manage/meters")({
  validateSearch: (search) => ({
    meter_id: parseNumber(search.meter_id),
    activity_id: parseNumber(search.activity_id),
    add: parseBoolean(search.add),
    tab: parseNumber(search.tab),
    q: typeof search.q === "string" ? search.q : undefined,
    filters: parseStringArray(search.filters),
  }),
  component: () => (
    <ProtectedRoute requiredScopes={["read"]}>
      <MetersView />
    </ProtectedRoute>
  ),
});
