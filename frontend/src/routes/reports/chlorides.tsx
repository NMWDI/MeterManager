import { createFileRoute } from "@tanstack/react-router";
import dayjs from "dayjs";
import { ChloridesReportView } from "@/views/Reports/Chlorides";
import { ProtectedRoute } from "@/ProtectedRoute";
import {
  isoDateParam,
  mapBaseLayerSchema,
  mapLatSchema,
  mapLngSchema,
  mapOverlayNamesSchema,
  mapZoomSchema,
  routeSearchHydrator,
} from "@/utils";
import { z } from "zod";

const searchSchema = z.object({
  from: isoDateParam
    .catch(dayjs().startOf("month").format("YYYY-MM-DD"))
    .default(dayjs().startOf("month").format("YYYY-MM-DD")),
  to: isoDateParam
    .catch(dayjs().endOf("month").format("YYYY-MM-DD"))
    .default(dayjs().endOf("month").format("YYYY-MM-DD")),
  mapBase: mapBaseLayerSchema.catch("OpenStreetMap").default("OpenStreetMap"),
  mapOverlays: mapOverlayNamesSchema,
  mapLat: mapLatSchema,
  mapLng: mapLngSchema,
  mapZoom: mapZoomSchema,
});

export const Route = createFileRoute("/reports/chlorides")({
  validateSearch: searchSchema,
  beforeLoad: ({ search, location }) =>
    routeSearchHydrator(location.pathname, search, location.searchStr),
  component: () => (
    <ProtectedRoute requiredScopes={["read"]}>
      <ChloridesReportView />
    </ProtectedRoute>
  ),
});
