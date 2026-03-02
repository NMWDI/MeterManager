import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import dayjs from "dayjs";

import { MonitoringWellsReportView } from "@/views/Reports/MonitoringWells";
import { ProtectedRoute } from "@/ProtectedRoute";

// yyyy-mm-dd
const dateSchema = z
  .preprocess((val) => {
    if (val == null || val === "") return undefined;
    const raw = Array.isArray(val) ? val[0] : val;
    const s = String(raw);
    return dayjs(s, "YYYY-MM-DD", true).isValid() ? s : undefined;
  }, z.string().optional())
  .catch(undefined);

const intPos = z.preprocess((val) => {
  if (val == null || val === "") return undefined;
  const raw = Array.isArray(val) ? val[0] : val;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}, z.number().int().positive().optional());

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
  if (val == null || val === "") return undefined;
  const raw = Array.isArray(val) ? val : [val];
  const nums = raw
    .flatMap((v) => (typeof v === "string" ? v.split(",") : [v]))
    .map((v) => String(v).trim())
    .filter(Boolean)
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0);
  return nums.length ? nums : undefined;
}, z.array(z.number().int().positive()).optional());

export const Route = createFileRoute("/reports/monitoringwells")({
  validateSearch: z.object({
    // form fields
    from: dateSchema.default(dayjs().startOf("month").format("YYYY-MM-DD")),
    to: dateSchema.default(dayjs().endOf("month").format("YYYY-MM-DD")),
    well_ids: numberList.default([]),

    avgAll: boolSchema(false), // averaging across all selected wells
    cmp1970: boolSchema(false), // compare to 1970 series
    cmpYear: intPos.catch(undefined).default(undefined), // compare to year

    // manual measurements DataGrid pagination
    m_page: z.coerce.number().int().min(0).catch(0),
    m_pageSize: z.coerce.number().int().min(5).max(50).catch(5),

    // averages DataGrid pagination
    a_page: z.coerce.number().int().min(0).catch(0),
    a_pageSize: z.coerce.number().int().min(5).max(50).catch(5),
  }),
  component: () => (
    <ProtectedRoute requiredScopes={["read"]}>
      <MonitoringWellsReportView />
    </ProtectedRoute>
  ),
});
