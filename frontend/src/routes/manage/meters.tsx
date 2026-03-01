import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { MetersView } from "@/views";
import { ProtectedRoute } from "@/ProtectedRoute";

const intPosOptional = z.preprocess((val) => {
  if (val === undefined || val === null || val === "") return undefined;
  const raw = Array.isArray(val) ? val[0] : val;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}, z.number().int().positive().optional());

const booleanDefaultTrue = z
  .preprocess((val) => {
    if (val === undefined || val === null || val === "") return undefined;
    const raw = Array.isArray(val) ? val[0] : val;

    if (raw === true || raw === "true" || raw === "1" || raw === 1) return true;
    if (raw === false || raw === "false" || raw === "0" || raw === 0)
      return false;

    return undefined;
  }, z.boolean().optional())
  .default(true);

const meterFilterEnum = z.enum([
  "installed",
  "stored",
  "sold",
  "scrapped",
  "unknown",
]);

const filtersSchema = z
  .preprocess((val) => {
    if (val === undefined || val === null || val === "") return undefined;
    const raw = Array.isArray(val) ? val : [val];
    const items = raw
      .flatMap((v) => (typeof v === "string" ? v.split(",") : [v]))
      .map((v) => String(v).trim())
      .filter(Boolean);

    const allowed = new Set([
      "installed",
      "stored",
      "sold",
      "scrapped",
      "unknown",
    ]);
    const filtered = items.filter((x) => allowed.has(x));

    return filtered.length ? filtered : undefined;
  }, z.array(meterFilterEnum).optional())
  .default(["installed"]);

const qSchema = z.preprocess((val) => {
  if (val === undefined || val === null) return undefined;
  const raw = Array.isArray(val) ? val[0] : val;
  const s = String(raw).trim();
  return s.length ? s : undefined;
}, z.string().optional());

const tabSchema = z
  .preprocess(
    (val) => {
      if (val === undefined || val === null || val === "") return undefined;
      const raw = Array.isArray(val) ? val[0] : val;
      return String(raw);
    },
    z.enum(["list", "map"]).optional(),
  )
  .catch("list");

const pageSchema = z.coerce.number().int().min(0).catch(0);
const pageSizeSchema = z.coerce.number().int().min(10).max(200).catch(25);

export const Route = createFileRoute("/manage/meters")({
  validateSearch: z.object({
    meter_id: intPosOptional,
    activity_id: intPosOptional,
    observation_id: intPosOptional,
    add: booleanDefaultTrue,
    tab: tabSchema.catch("list").default("list"),
    q: qSchema,
    filters: filtersSchema,
    // all meters list pagination
    m_page: pageSchema,
    m_pageSize: pageSizeSchema,
    // meter history pagination
    h_page: pageSchema,
    h_pageSize: pageSizeSchema,
  }),
  component: () => (
    <ProtectedRoute requiredScopes={["read"]}>
      <MetersView />
    </ProtectedRoute>
  ),
});
