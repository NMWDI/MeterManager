import { useEffect, useRef } from "react";
import { useDebounce } from "use-debounce";
import { LayersControl, MapContainer, Marker, Tooltip } from "react-leaflet";
import { Box, Typography } from "@mui/material";
import { useNavigate } from "@tanstack/react-router";
import { Route } from "@/routes/manage/wells";
import { useGetWellLocations } from "@/service";
import { Well } from "@/interfaces";
import {
  BoundariesLayer,
  MapUrlStateSync,
  OpenStreetMapLayer,
  SatelliteLayer,
  SoutheastGuideLayer,
  MapFullscreenToggle,
  TransporationLayer,
  WellMapLegend,
} from "@/components";
import { BlueMapIcon, RedMapIcon, BlackMapIcon } from "@/components/MapIcons";
import { WellStatus } from "@/enums";

import L from "leaflet";
import "leaflet/dist/leaflet.css";

// @ts-ignore
import MarkerClusterGroup from "@changey/react-leaflet-markercluster";
import "@changey/react-leaflet-markercluster/dist/styles.min.css";

import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  getMapLayersControlKey,
  normalizeMapBaseLayer,
  normalizeMapOverlayNames,
  parseMapView,
} from "@/utils";

const BASE_LAYER_NAMES = ["Satellite", "OpenStreetMap"] as const;
const OVERLAY_NAMES = [
  "Wells",
  "Clorides Report Region Guide",
  "Transportation",
  "Boundaries and Places",
] as const;
const DEFAULT_BASE_LAYER = "OpenStreetMap";
const DEFAULT_OVERLAYS = ["Clorides Report Region Guide", "Wells"];

export default function WellSelectionMap({
  wellSearchQueryProp,
}: {
  wellSearchQueryProp: string;
}) {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  const [wellSearchDebounced] = useDebounce(wellSearchQueryProp, 250);
  const wellQuery = useGetWellLocations(wellSearchDebounced);
  const mapBaseLayer = normalizeMapBaseLayer(
    search.mapBase,
    BASE_LAYER_NAMES,
    DEFAULT_BASE_LAYER,
  );
  const mapOverlayNames = normalizeMapOverlayNames(
    search.mapOverlays,
    OVERLAY_NAMES,
    DEFAULT_OVERLAYS,
  );
  const mapView = parseMapView(search, {
    center: DEFAULT_MAP_CENTER,
    zoom: DEFAULT_MAP_ZOOM,
  });

  const setSearch = (updater: (prev: typeof search) => typeof search) => {
    navigate({
      to: "/manage/wells",
      search: (prev) => updater(prev as typeof search),
      replace: true,
    });
  };

  useEffect(() => {
    if (wellQuery.hasNextPage && !wellQuery.isFetchingNextPage) {
      wellQuery.fetchNextPage();
    }
  }, [wellQuery.hasNextPage, wellQuery.isFetchingNextPage]);

  const wellMarkers = wellQuery.data?.pages.flat() ?? [];

  const handleSelectWell = (well: Well) => {
    navigate({
      to: "/manage/wells",
      search: (prev) => ({
        ...(prev as any),
        well_id: well.id,
        add: false,
        tab: "map",
      }),
      replace: true,
    });
  };

  return (
    <>
      <Box
        ref={mapContainerRef}
        sx={{
          borderRadius: 2,
          overflow: "hidden",
          height: "100%",
          minHeight: 500,
          position: "relative",
          "&:fullscreen": {
            borderRadius: 0,
            minHeight: "100vh",
          },
          "& .leaflet-container": { height: "100%", width: "100%" },
        }}
      >
        <MapContainer
          center={mapView.center}
          zoom={mapView.zoom}
          style={{ height: "100%", width: "100%", minHeight: 500 }}
          maxZoom={18}
        >
          <MapUrlStateSync
            allowedBaseLayers={BASE_LAYER_NAMES}
            allowedOverlays={OVERLAY_NAMES}
            defaultBaseLayer={DEFAULT_BASE_LAYER}
            defaultOverlays={DEFAULT_OVERLAYS}
            search={search}
            setSearch={setSearch}
          />
          <LayersControl
            key={getMapLayersControlKey(mapBaseLayer, mapOverlayNames)}
            position="topleft"
          >
            {/* Base Layers */}
            <SatelliteLayer checked={mapBaseLayer === "Satellite"} />
            <OpenStreetMapLayer checked={mapBaseLayer === "OpenStreetMap"} />
            <SoutheastGuideLayer
              checked={mapOverlayNames.includes("Clorides Report Region Guide")}
            />

            {/* Wells Cluster Overlay */}
            <LayersControl.Overlay
              checked={mapOverlayNames.includes("Wells")}
              name="Wells"
            >
              <MarkerClusterGroup
                chunkedLoading
                maxClusterRadius={35}
                disableClusteringAtZoom={12}
                iconCreateFunction={(cluster: any) => {
                  const count = cluster.getChildCount();
                  return L.divIcon({
                    html: `<div style="
                      background-color: rgba(0, 123, 255, 0.8);
                      color: white;
                      width: 40px;
                      height: 40px;
                      border-radius: 50%;
                      display: flex;
                      justify-content: center;
                      align-items: center;
                      font-weight: bold;
                      border: 2px solid white;
                    ">${count}</div>`,
                    className: "",
                    iconSize: [40, 40],
                  });
                }}
              >
                {wellQuery.isSuccess &&
                  wellMarkers.map((well: Well) => (
                    <Marker
                      key={well.id}
                      position={[
                        well.location?.latitude ?? 0,
                        well.location?.longitude ?? 0,
                      ]}
                      eventHandlers={{
                        click: () => handleSelectWell(well),
                      }}
                      icon={getWellIcon(well)}
                    >
                      <Tooltip>
                        {well.name || well.ra_number || well.id}
                      </Tooltip>
                    </Marker>
                  ))}
              </MarkerClusterGroup>
            </LayersControl.Overlay>
            <TransporationLayer
              checked={mapOverlayNames.includes("Transportation")}
            />
            <BoundariesLayer
              checked={mapOverlayNames.includes("Boundaries and Places")}
            />
          </LayersControl>
          <MapFullscreenToggle containerRef={mapContainerRef} />
          <WellMapLegend />
        </MapContainer>
      </Box>
      {/* Loading first page */}
      {wellQuery.isLoading && (
        <Box py={2}>
          <Typography
            variant="h6"
            sx={{
              pointerEvents: "none",
              userSelect: "none",
            }}
          >
            Loading well markers...
          </Typography>
        </Box>
      )}
      {/* Loading additional pages */}
      {wellQuery.isFetchingNextPage && (
        <Box py={2}>
          <Typography
            variant="h6"
            sx={{
              pointerEvents: "none",
              userSelect: "none",
            }}
          >
            Loading more wells...
          </Typography>
        </Box>
      )}
      {wellQuery.isSuccess && wellMarkers.length === 0 && (
        <Box py={2}>
          <Typography
            variant="h6"
            color="text.secondary"
            sx={{
              pointerEvents: "none",
              userSelect: "none",
            }}
          >
            No wells found for that search.
          </Typography>
        </Box>
      )}
      {/* Error */}
      {wellQuery.isError && (
        <Box py={2}>
          <Typography
            variant="h6"
            color="error"
            sx={{
              pointerEvents: "none",
              userSelect: "none",
            }}
          >
            Failed to load wells: {wellQuery.error.message}
          </Typography>
        </Box>
      )}
    </>
  );
}

const getWellIcon = (well: Well) => {
  if (well.well_status_id === WellStatus.PLUGGED) {
    return BlackMapIcon;
  }
  if (well.chloride_group_id != null) {
    return RedMapIcon;
  }
  return BlueMapIcon;
};
