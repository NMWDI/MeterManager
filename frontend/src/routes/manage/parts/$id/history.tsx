import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import dayjs from "dayjs";
import { PartsHistory } from "@/views";
import { ProtectedRoute } from "@/ProtectedRoute";
import { API_URL } from "@/config";
import {
  dayjsDateParam,
  pageParam,
} from "@/utils";
import { PartHistoryResponse } from "@/interfaces/PartHistoryResponse";

const eventTypeValues = ["initial", "used", "added", "current"] as const;
const defaultEventTypes: [
  (typeof eventTypeValues)[number],
  ...(typeof eventTypeValues)[number][],
] = ["initial", "used", "added", "current"];

const eventTypesSchema = z
  .preprocess((val) => {
    if (val == null || val === "") return undefined;

    let rawValue = val;
    if (typeof rawValue === "string") {
      try {
        const parsed = JSON.parse(rawValue);
        if (Array.isArray(parsed)) rawValue = parsed;
      } catch {
        // keep raw string and process as CSV
      }
    }

    const raw = Array.isArray(rawValue) ? rawValue : [rawValue];
    const values = raw
      .flatMap((v) => (typeof v === "string" ? v.split(",") : [v]))
      .map((v) => String(v).trim())
      .filter(
        (v): v is (typeof eventTypeValues)[number] =>
          eventTypeValues.includes(v as (typeof eventTypeValues)[number]),
      );

    const set = new Set(values);
    return eventTypeValues.filter((type) => set.has(type));
  }, z.array(z.enum(eventTypeValues)).nonempty().optional())
  .catch(defaultEventTypes)
  .default(defaultEventTypes);

const searchSchema = z.object({
  from: dayjsDateParam.catch(undefined).default(undefined),
  to: dayjsDateParam
    .catch(dayjs().endOf("month").format("YYYY-MM-DD"))
    .default(dayjs().endOf("month").format("YYYY-MM-DD")),
  type: eventTypesSchema,
  q: z.string().catch("").default(""),
  page: pageParam(0, 0),
  pageSize: pageParam(25, 10),
});

export const Route = createFileRoute("/manage/parts/$id/history")({
  validateSearch: searchSchema,
  loader: async ({ params, context }) => {
    if (typeof window === "undefined") return null;

    const token = window.localStorage.getItem("_auth");
    if (!token) return null;

    await context.queryClient.prefetchQuery(
      ["parts-history", params.id],
      async () => {
        const response = await fetch(`${API_URL}/parts/${params.id}/history`, {
          headers: { Authorization: `bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error(response.status.toString());
        }

        return (await response.json()) as PartHistoryResponse;
      },
    );

    return null;
  },
  component: () => (
    <ProtectedRoute requiredScopes={["admin"]}>
      <PartsHistory />
    </ProtectedRoute>
  ),
});
