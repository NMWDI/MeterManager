import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { PartsView } from "@/views";

const tri = z.enum(["all", "true", "false"]).catch("all");
const boolDefaultTrue = z
  .preprocess((val) => {
    if (val === undefined || val === null || val === "") return undefined;
    const raw = Array.isArray(val) ? val[0] : val;

    if (raw === true || raw === "true" || raw === "1" || raw === 1) return true;
    if (raw === false || raw === "false" || raw === "0" || raw === 0)
      return false;

    return undefined;
  }, z.boolean().optional())
  .catch(true)
  .default(true);

export const Route = createFileRoute("/manage/parts/")({
  validateSearch: z.object({
    part_id: z.coerce.number().int().positive().optional(),
    part_add: boolDefaultTrue,
    part_q: z.string().optional().default(""),
    part_in_use: tri.default("true"),
    part_commonly_used: tri.default("all"),
    p_page: z.coerce.number().int().min(0).catch(0),
    p_pageSize: z.coerce.number().int().min(10).max(200).catch(25),

    meter_type_id: z.coerce.number().int().positive().optional(),
    meter_type_add: boolDefaultTrue,
    meter_type_q: z.string().optional().default(""),
    meter_type_in_use: tri.default("true"),
    mt_page: z.coerce.number().int().min(0).catch(0),
    mt_pageSize: z.coerce.number().int().min(10).max(200).catch(25),
  }),
  component: PartsView,
});
