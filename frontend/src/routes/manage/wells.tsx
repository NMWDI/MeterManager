import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { WellManagementView } from "@/views";
import { ProtectedRoute } from "@/ProtectedRoute";
import {
  mapBaseLayerSchema,
  mapLatSchema,
  mapLngSchema,
  mapOverlayNamesSchema,
  mapZoomSchema,
} from "@/utils";

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
  .catch(true)
  .default(true);

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
      const s = String(raw);
      return s === "list" || s === "map" ? s : "list";
    },
    z.enum(["list", "map"]).optional(),
  )
  .catch("list")
  .default("list");

export const Route = createFileRoute("/manage/wells")({
  validateSearch: z
    .object({
      tab: tabSchema,
      add: booleanDefaultTrue,
      q: qSchema,
      well_id: intPosOptional,
      page: z.coerce.number().int().min(0).catch(0),
      pageSize: z.coerce.number().int().min(10).max(200).catch(25),
      mapBase: mapBaseLayerSchema
        .catch("OpenStreetMap")
        .default("OpenStreetMap"),
      mapOverlays: mapOverlayNamesSchema,
      mapLat: mapLatSchema,
      mapLng: mapLngSchema,
      mapZoom: mapZoomSchema,
    })
    .passthrough(),
  component: () => (
    <ProtectedRoute requiredScopes={["read"]}>
      <WellManagementView />
    </ProtectedRoute>
  ),
});
