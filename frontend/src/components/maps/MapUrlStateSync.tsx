import { useEffect, useMemo, useRef } from "react";
import type { LayersControlEvent } from "leaflet";
import { useMap } from "react-leaflet";
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  normalizeMapBaseLayer,
  normalizeMapOverlayNames,
  parseMapView,
  serializeMapView,
} from "@/utils";

type MapSearchState = {
  mapBase?: string;
  mapOverlays?: string[];
  mapLat?: number;
  mapLng?: number;
  mapZoom?: number;
};

type MapUrlStateSyncProps<TSearch extends MapSearchState> = {
  allowedBaseLayers: readonly string[];
  allowedOverlays: readonly string[];
  defaultBaseLayer: string;
  defaultOverlays: string[];
  search: TSearch;
  setSearch: (updater: (prev: TSearch) => TSearch) => void;
};

const sortNames = (names: string[]) => [...names].sort();

const arraysEqual = (left: string[], right: string[]) =>
  left.length === right.length &&
  left.every((value, index) => value === right[index]);

export const MapUrlStateSync = <TSearch extends MapSearchState>({
  allowedBaseLayers,
  allowedOverlays,
  defaultBaseLayer,
  defaultOverlays,
  search,
  setSearch,
}: MapUrlStateSyncProps<TSearch>) => {
  const map = useMap();
  const searchRef = useRef(search);
  const activeBaseLayerRef = useRef(
    normalizeMapBaseLayer(search.mapBase, allowedBaseLayers, defaultBaseLayer),
  );
  const activeOverlaysRef = useRef(
    normalizeMapOverlayNames(
      search.mapOverlays,
      allowedOverlays,
      defaultOverlays,
    ),
  );

  const normalizedDefaults = useMemo(
    () => ({
      baseLayer: normalizeMapBaseLayer(
        defaultBaseLayer,
        allowedBaseLayers,
        defaultBaseLayer,
      ),
      overlays: normalizeMapOverlayNames(
        defaultOverlays,
        allowedOverlays,
        defaultOverlays,
      ),
      view: {
        center: DEFAULT_MAP_CENTER,
        zoom: DEFAULT_MAP_ZOOM,
      },
    }),
    [allowedBaseLayers, allowedOverlays, defaultBaseLayer, defaultOverlays],
  );

  useEffect(() => {
    searchRef.current = search;
    activeBaseLayerRef.current = normalizeMapBaseLayer(
      search.mapBase,
      allowedBaseLayers,
      defaultBaseLayer,
    );
    activeOverlaysRef.current = normalizeMapOverlayNames(
      search.mapOverlays,
      allowedOverlays,
      defaultOverlays,
    );
  }, [
    allowedBaseLayers,
    allowedOverlays,
    defaultBaseLayer,
    defaultOverlays,
    search,
  ]);

  useEffect(() => {
    const nextView = parseMapView(search, normalizedDefaults.view);
    const currentCenter = map.getCenter();
    const currentZoom = map.getZoom();

    const viewChanged =
      Math.abs(currentCenter.lat - nextView.center[0]) > 0.00001 ||
      Math.abs(currentCenter.lng - nextView.center[1]) > 0.00001 ||
      currentZoom !== nextView.zoom;

    if (viewChanged) {
      map.setView(nextView.center, nextView.zoom, { animate: false });
    }
  }, [map, normalizedDefaults.view, search]);

  useEffect(() => {
    const syncSearchFromMap = () => {
      const currentSearch = searchRef.current;
      const baseLayer = normalizeMapBaseLayer(
        activeBaseLayerRef.current,
        allowedBaseLayers,
        defaultBaseLayer,
      );
      const overlays = normalizeMapOverlayNames(
        activeOverlaysRef.current,
        allowedOverlays,
        defaultOverlays,
      );
      const viewState = serializeMapView(
        map.getCenter(),
        map.getZoom(),
        normalizedDefaults.view,
      );
      const nextBaseLayer =
        baseLayer === normalizedDefaults.baseLayer ? undefined : baseLayer;
      const nextOverlays = arraysEqual(overlays, normalizedDefaults.overlays)
        ? undefined
        : overlays;
      const currentBaseLayer = normalizeMapBaseLayer(
        currentSearch.mapBase,
        allowedBaseLayers,
        defaultBaseLayer,
      );
      const currentOverlays = normalizeMapOverlayNames(
        currentSearch.mapOverlays,
        allowedOverlays,
        defaultOverlays,
      );
      const currentView = parseMapView(currentSearch, normalizedDefaults.view);

      const baseChanged = currentBaseLayer !== baseLayer;
      const overlaysChanged = !arraysEqual(currentOverlays, overlays);
      const viewChanged =
        Math.abs(
          currentView.center[0] -
            (viewState.mapLat ?? normalizedDefaults.view.center[0]),
        ) >
          0.00001 ||
        Math.abs(
          currentView.center[1] -
            (viewState.mapLng ?? normalizedDefaults.view.center[1]),
        ) >
          0.00001 ||
        currentView.zoom !== (viewState.mapZoom ?? normalizedDefaults.view.zoom);

      if (!baseChanged && !overlaysChanged && !viewChanged) {
        return;
      }

      setSearch((prev) => ({
        ...prev,
        mapBase: nextBaseLayer,
        mapOverlays: nextOverlays,
        mapLat: viewState.mapLat,
        mapLng: viewState.mapLng,
        mapZoom: viewState.mapZoom,
      }));
    };

    const handleBaseLayerChange = (event: LayersControlEvent) => {
      activeBaseLayerRef.current = event.name;
      syncSearchFromMap();
    };

    const handleOverlayAdd = (event: LayersControlEvent) => {
      activeOverlaysRef.current = sortNames([
        ...activeOverlaysRef.current,
        event.name,
      ]);
      syncSearchFromMap();
    };

    const handleOverlayRemove = (event: LayersControlEvent) => {
      activeOverlaysRef.current = sortNames(
        activeOverlaysRef.current.filter((name) => name !== event.name),
      );
      syncSearchFromMap();
    };

    map.on("moveend", syncSearchFromMap);
    map.on("baselayerchange", handleBaseLayerChange);
    map.on("overlayadd", handleOverlayAdd);
    map.on("overlayremove", handleOverlayRemove);

    return () => {
      map.off("moveend", syncSearchFromMap);
      map.off("baselayerchange", handleBaseLayerChange);
      map.off("overlayadd", handleOverlayAdd);
      map.off("overlayremove", handleOverlayRemove);
    };
  }, [
    allowedBaseLayers,
    allowedOverlays,
    defaultBaseLayer,
    defaultOverlays,
    map,
    normalizedDefaults.baseLayer,
    normalizedDefaults.overlays,
    normalizedDefaults.view,
    setSearch,
  ]);

  return null;
};
