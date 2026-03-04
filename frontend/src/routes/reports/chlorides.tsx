import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ChloridesReportView } from "@/views/Reports/Chlorides";
import { ProtectedRoute } from "@/ProtectedRoute";
import {
  mapBaseLayerSchema,
  mapLatSchema,
  mapLngSchema,
  mapOverlayNamesSchema,
  mapZoomSchema,
} from "@/utils";

const isoDate = z.preprocess((val) => {
  const raw = Array.isArray(val) ? val[0] : val;
  if (raw == null || raw === "") return undefined;
  const s = String(raw).trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : undefined;
}, z.string().optional());

export const Route = createFileRoute("/reports/chlorides")({
  validateSearch: z.object({
    from: isoDate.catch(undefined),
    to: isoDate.catch(undefined),
    mapBase: mapBaseLayerSchema.catch("OpenStreetMap").default("OpenStreetMap"),
    mapOverlays: mapOverlayNamesSchema,
    mapLat: mapLatSchema,
    mapLng: mapLngSchema,
    mapZoom: mapZoomSchema,
  }),
  component: () => (
    <ProtectedRoute requiredScopes={["read"]}>
      <ChloridesReportView />
    </ProtectedRoute>
  ),
});
