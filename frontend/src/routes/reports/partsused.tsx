import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import dayjs from "dayjs";
import { PartsUsedReportView } from "@/views/Reports/PartsUsed";
import { ProtectedRoute } from "@/ProtectedRoute";

const dateSchema = z
  .preprocess((val) => {
    if (val == null || val === "") return undefined;
    const raw = Array.isArray(val) ? val[0] : val;
    const s = String(raw).trim();
    return dayjs(s, "YYYY-MM-DD", true).isValid() ? s : undefined;
  }, z.string().optional())
  .catch(undefined);

const boolSchema = (defaultValue: boolean) =>
  z
    .preprocess((val) => {
      if (val === undefined || val === null || val === "") return undefined;
      const raw = Array.isArray(val) ? val[0] : val;
      if (raw === true || raw === "true" || raw === "1" || raw === 1)
        return true;
      if (raw === false || raw === "false" || raw === "0" || raw === 0)
        return false;
      return undefined;
    }, z.boolean().optional())
    .catch(defaultValue)
    .default(defaultValue);

const numberList = z.preprocess((val) => {
  if (val == null || val === "") return [];
  const raw = Array.isArray(val) ? val : [val];
  const nums = raw
    .flatMap((v) => (typeof v === "string" ? v.split(",") : [v]))
    .map((v) => String(v).trim())
    .filter(Boolean)
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0);
  return Array.from(new Set(nums));
}, z.array(z.number().int().positive())).catch([]);

export const Route = createFileRoute("/reports/partsused")({
  validateSearch: z.object({
    from: dateSchema.default(dayjs().startOf("month").format("YYYY-MM-DD")),
    to: dateSchema.default(dayjs().endOf("month").format("YYYY-MM-DD")),
    part_types: numberList.default([]),
    parts: numberList.default([]),
    in_use: boolSchema(true),
    page: z.coerce.number().int().min(0).catch(0).default(0),
    pageSize: z.coerce.number().int().min(5).max(100).catch(5).default(5),
  }),
  component: () => (
    <ProtectedRoute requiredScopes={["read"]}>
      <PartsUsedReportView />
    </ProtectedRoute>
  ),
});
