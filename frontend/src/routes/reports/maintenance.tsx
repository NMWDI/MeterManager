import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { MaintenanceReportView } from "@/views/Reports/Maintenance";
import { ProtectedRoute } from "@/ProtectedRoute";

const isoDate = z
  .preprocess((val) => {
    const raw = Array.isArray(val) ? val[0] : val;
    if (raw == null || raw === "") return undefined;
    const s = String(raw).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : undefined;
  }, z.string().optional())
  .optional();

const intNonNeg = z.preprocess((val) => {
  const raw = Array.isArray(val) ? val[0] : val;
  if (raw == null || raw === "") return undefined;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 ? n : undefined;
}, z.number().int().nonnegative().optional());

const pageSizeSchema = z.preprocess((val) => {
  const raw = Array.isArray(val) ? val[0] : val;
  if (raw == null || raw === "") return undefined;
  const n = Number(raw);
  const allowed = new Set([5, 10, 25, 50, 100]);
  return Number.isInteger(n) && allowed.has(n) ? n : undefined;
}, z.number().int().optional());

const technicianIdsSchema = z
  .preprocess((val) => {
    if (val === undefined || val === null || val === "") return [];
    const raw = Array.isArray(val) ? val : [val];

    const items = raw
      .flatMap((v) => (typeof v === "string" ? v.split(",") : [v]))
      .map((v) => Number(String(v).trim()))
      .filter((n) => Number.isInteger(n));

    // unique
    return Array.from(new Set(items));
  }, z.array(z.number().int()))
  .catch([]);

const trssSchema = z
  .preprocess((val) => {
    const raw = Array.isArray(val) ? val[0] : val;
    if (raw == null) return undefined;
    const s = String(raw).trim();
    return s.length ? s : undefined;
  }, z.string().optional())
  .catch(undefined);

export const Route = createFileRoute("/reports/maintenance")({
  validateSearch: z.object({
    from: isoDate.catch(undefined),
    to: isoDate.catch(undefined),
    trss: trssSchema,

    technicians: technicianIdsSchema,

    page: intNonNeg.catch(0).default(0),
    pageSize: pageSizeSchema.catch(5).default(5),
  }),
  component: () => (
    <ProtectedRoute requiredScopes={["read"]}>
      <MaintenanceReportView />
    </ProtectedRoute>
  ),
});
