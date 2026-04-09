import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { MetersView } from "@/views";
import { ProtectedRoute } from "@/ProtectedRoute";
import {
  booleanParam,
  mapBaseLayerSchema,
  mapLatSchema,
  mapLngSchema,
  mapOverlayNamesSchema,
  mapZoomSchema,
  optionalPositiveInt,
  optionalTrimmedString,
  pageParam,
  routeSearchHydrator,
  triStateParam,
} from "@/utils";

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

const searchSchema = z.object({
  meter_id: optionalPositiveInt.catch(undefined).default(undefined),
  activity_id: optionalPositiveInt.catch(undefined).default(undefined),
  observation_id: optionalPositiveInt.catch(undefined).default(undefined),
  add: booleanParam(true),
  tab: tabSchema.default("list"),
  q: optionalTrimmedString.catch("").default(""),
  filters: filtersSchema,
  m_sizeSort: triStateParam("all"),
  // all meters list pagination
  m_page: pageParam(0, 0),
  m_pageSize: pageParam(25, 10),
  // meter history pagination
  h_page: pageParam(0, 0),
  h_pageSize: pageParam(25, 10),
  mapBase: mapBaseLayerSchema.catch("OpenStreetMap").default("OpenStreetMap"),
  mapOverlays: mapOverlayNamesSchema,
  mapLat: mapLatSchema,
  mapLng: mapLngSchema,
  mapZoom: mapZoomSchema,
});

export const Route = createFileRoute("/manage/meters")({
  validateSearch: searchSchema,
  beforeLoad: ({ search, location }) =>
    routeSearchHydrator(location.pathname, search, location.searchStr),
  component: () => (
    <ProtectedRoute requiredScopes={["read"]}>
      <MetersView />
    </ProtectedRoute>
  ),
});
