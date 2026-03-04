import { z } from "zod";

export const DEFAULT_MAP_CENTER: [number, number] = [33, -104];
export const DEFAULT_MAP_ZOOM = 8;

export const MAP_BASE_LAYER_NAMES = ["Satellite", "OpenStreetMap"] as const;

const optionalSearchString = z.preprocess((val) => {
  if (val === undefined || val === null || val === "") return undefined;
  const raw = Array.isArray(val) ? val[0] : val;
  const s = String(raw).trim();
  return s.length ? s : undefined;
}, z.string().optional());

const optionalSearchNumber = z.preprocess((val) => {
  if (val === undefined || val === null || val === "") return undefined;
  const raw = Array.isArray(val) ? val[0] : val;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}, z.number().optional());

export const mapBaseLayerSchema = optionalSearchString;

export const mapOverlayNamesSchema = z
  .preprocess((val) => {
    if (val === undefined || val === null || val === "") return undefined;
    const raw = Array.isArray(val) ? val : [val];
    const items = raw
      .flatMap((v) => (typeof v === "string" ? v.split(",") : [v]))
      .map((v) => String(v).trim())
      .filter(Boolean);

    return items.length ? items : undefined;
  }, z.array(z.string()).optional())
  .catch(undefined);

export const mapLatSchema = optionalSearchNumber
  .pipe(z.number().min(-90).max(90).optional())
  .catch(undefined);

export const mapLngSchema = optionalSearchNumber
  .pipe(z.number().min(-180).max(180).optional())
  .catch(undefined);

export const mapZoomSchema = optionalSearchNumber
  .pipe(z.number().int().min(0).max(22).optional())
  .catch(undefined);

type MapSearchState = {
  mapBase?: string;
  mapOverlays?: string[];
  mapLat?: number;
  mapLng?: number;
  mapZoom?: number;
};

const roundCoordinate = (value: number) => Number(value.toFixed(5));

export const normalizeMapBaseLayer = (
  value: string | undefined,
  allowed: readonly string[],
  fallback: string,
) => (value && allowed.includes(value) ? value : fallback);

export const normalizeMapOverlayNames = (
  value: string[] | undefined,
  allowed: readonly string[],
  fallback: string[],
) => {
  const source = value?.length ? value : fallback;
  return [...new Set(source.filter((name) => allowed.includes(name)))].sort();
};

export const parseMapView = (
  search: MapSearchState,
  fallback = {
    center: DEFAULT_MAP_CENTER,
    zoom: DEFAULT_MAP_ZOOM,
  },
) => ({
  center: [
    search.mapLat ?? fallback.center[0],
    search.mapLng ?? fallback.center[1],
  ] as [number, number],
  zoom: search.mapZoom ?? fallback.zoom,
});

export const serializeMapView = (
  center: { lat: number; lng: number },
  zoom: number,
  fallback = {
    center: DEFAULT_MAP_CENTER,
    zoom: DEFAULT_MAP_ZOOM,
  },
) => {
  const lat = roundCoordinate(center.lat);
  const lng = roundCoordinate(center.lng);

  return {
    mapLat: lat === fallback.center[0] ? undefined : lat,
    mapLng: lng === fallback.center[1] ? undefined : lng,
    mapZoom: zoom === fallback.zoom ? undefined : zoom,
  };
};

export const getMapLayersControlKey = (
  baseLayerName: string,
  overlayNames: string[],
) => `${baseLayerName}::${overlayNames.slice().sort().join("|")}`;
