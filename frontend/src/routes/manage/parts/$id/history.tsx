import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import dayjs from "dayjs";
import { PartsHistory } from "@/views";
import { ProtectedRoute } from "@/ProtectedRoute";

const dateSchema = z
  .preprocess((val) => {
    if (val == null || val === "") return undefined;
    const raw = Array.isArray(val) ? val[0] : val;
    const s = String(raw).trim();
    return dayjs(s, "YYYY-MM-DD", true).isValid() ? s : undefined;
  }, z.string().optional())
  .catch(undefined);

const eventTypeValues = ["initial", "used", "added", "current"] as const;

const eventTypesSchema = z
  .preprocess((val) => {
    if (val == null || val === "") return undefined;

    const raw = Array.isArray(val) ? val : [val];
    const values = raw
      .flatMap((v) => (typeof v === "string" ? v.split(",") : [v]))
      .map((v) => String(v).trim())
      .filter(
        (v): v is (typeof eventTypeValues)[number] =>
          eventTypeValues.includes(v as (typeof eventTypeValues)[number]),
      );

    return Array.from(new Set(values));
  }, z.array(z.enum(eventTypeValues)).optional())
  .catch([...eventTypeValues])
  .default([...eventTypeValues]);

const pageSchema = z.coerce.number().int().min(0).catch(0).default(0);
const pageSizeSchema = z.coerce.number().int().min(10).max(200).catch(25).default(25);

export const Route = createFileRoute("/manage/parts/$id/history")({
  validateSearch: z.object({
    from: dateSchema.optional().catch(undefined),
    to: dateSchema.default(dayjs().endOf("month").format("YYYY-MM-DD")),
    type: eventTypesSchema,
    q: z.string().optional().catch("").default(""),
    page: pageSchema,
    pageSize: pageSizeSchema,
  }),
  component: () => (
    <ProtectedRoute requiredScopes={["admin"]}>
      <PartsHistory />
    </ProtectedRoute>
  ),
});
