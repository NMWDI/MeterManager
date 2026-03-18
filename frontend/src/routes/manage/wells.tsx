import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { WellManagementView } from "@/views";
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
} from "@/utils";

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

const searchSchema = z
  .object({
    tab: tabSchema,
    add: booleanParam(true),
    q: optionalTrimmedString.catch("").default(""),
    well_id: optionalPositiveInt.catch(undefined).default(undefined),
    page: pageParam(0, 0),
    pageSize: pageParam(25, 10),
    mapBase: mapBaseLayerSchema.catch("OpenStreetMap").default("OpenStreetMap"),
    mapOverlays: mapOverlayNamesSchema,
    mapLat: mapLatSchema,
    mapLng: mapLngSchema,
    mapZoom: mapZoomSchema,
  })
  .passthrough();

export const Route = createFileRoute("/manage/wells")({
  validateSearch: searchSchema,
  beforeLoad: ({ search, location }) =>
    routeSearchHydrator(location.pathname, search, location.searchStr),
  component: () => (
    <ProtectedRoute requiredScopes={["read"]}>
      <WellManagementView />
    </ProtectedRoute>
  ),
});
