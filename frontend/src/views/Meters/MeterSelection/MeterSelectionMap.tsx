import { useRef } from "react";
import { useDebounce } from "use-debounce";
import {
  MapContainer,
  Tooltip,
  GeoJSON,
  LayersControl,
  Marker,
  Pane,
} from "react-leaflet";
import { MeterMapDTO } from "@/interfaces";

import L from "leaflet";
import { FeatureCollection } from "geojson";

import "leaflet/dist/leaflet.css";
import "@changey/react-leaflet-markercluster/dist/styles.min.css";
import "@/css/map.css";
import * as tr_data from "@/data/RoswellTR_v2.json";
import * as ss_data from "@/data/RoswellSS.json";

import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import { useGetMeterLocations } from "@/service";
import { Box, Typography } from "@mui/material";
import { useNavigate } from "@tanstack/react-router";

// @ts-ignore
import MarkerClusterGroup from "@changey/react-leaflet-markercluster";
import {
  OpenStreetMapLayer,
  SatelliteLayer,
  MapFullscreenToggle,
  MeterMapColorLegend,
  TransporationLayer,
  BoundariesLayer,
  MapUrlStateSync,
} from "@/components";
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  getMapLayersControlKey,
  getMeterMarkerColor,
  normalizeMapBaseLayer,
  normalizeMapOverlayNames,
  parseMapView,
} from "@/utils";
import { Route } from "@/routes/manage/meters";

const BASE_LAYER_NAMES = ["Satellite", "OpenStreetMap"] as const;
const OVERLAY_NAMES = [
  "Meters",
  "Section",
  "Township Range",
  "Transportation",
  "Boundaries and Places",
] as const;
const DEFAULT_BASE_LAYER = "OpenStreetMap";
const DEFAULT_OVERLAYS = ["Meters"];

const DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow });
L.Marker.prototype.options.icon = DefaultIcon;

// Static geojson data
const trData: FeatureCollection = tr_data as FeatureCollection;
const ssData: FeatureCollection = ss_data as FeatureCollection;

export default function MeterSelectionMap({
  onMeterSelection,
  meterSearch,
}: {
  meterSearch: string;
  onMeterSelection: Function;
}) {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [meterSearchDebounced] = useDebounce(meterSearch, 250);
  const meterMarkers = useGetMeterLocations(meterSearchDebounced);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
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
      to: "/manage/meters",
      search: (prev) => updater(prev as typeof search),
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
          minHeight: 320,
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
          style={{ height: "100%", width: "100%" }}
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

            {/* Markers Cluster Overlay */}
            <LayersControl.Overlay
              checked={mapOverlayNames.includes("Meters")}
              name="Meters"
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
                {meterMarkers.isSuccess &&
                  meterMarkers.data.map((meter: MeterMapDTO) => {
                    const color = meter.last_pm
                      ? getMeterMarkerColor(meter.last_pm)
                      : "black";

                    return (
                      <Marker
                        key={meter.id}
                        position={[
                          meter.location.latitude,
                          meter.location.longitude,
                        ]}
                        eventHandlers={{
                          click: () => onMeterSelection(meter.id),
                        }}
                        icon={L.divIcon({
                          className: "",
                          html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid black;"></div>`,
                        })}
                      >
                        <Tooltip>{meter.serial_number}</Tooltip>
                      </Marker>
                    );
                  })}
              </MarkerClusterGroup>
            </LayersControl.Overlay>

            {/* Section GeoJSON */}
            <LayersControl.Overlay
              checked={mapOverlayNames.includes("Section")}
              name="Section"
            >
              <Pane name="section_overlay" style={{ zIndex: 600 }}>
                <GeoJSON
                  data={ssData}
                  style={() => ({
                    color: "red",
                    dashArray: "5, 10",
                    weight: 2,
                    fillOpacity: 0,
                  })}
                />
              </Pane>
            </LayersControl.Overlay>

            {/* Township/Range GeoJSON */}
            <LayersControl.Overlay
              checked={mapOverlayNames.includes("Township Range")}
              name="Township Range"
            >
              <Pane name="township_range_overlay" style={{ zIndex: 625 }}>
                <GeoJSON
                  data={trData}
                  style={() => ({
                    color: "black",
                    weight: 3,
                    fillOpacity: 0,
                  })}
                  onEachFeature={(feature, layer) => {
                    if (feature.properties?.TWNSHPLAB) {
                      layer.bindTooltip(feature.properties.TWNSHPLAB, {
                        permanent: true,
                        direction: "center",
                        className: "geojson-label",
                      });
                    }
                  }}
                />
              </Pane>
            </LayersControl.Overlay>
            <TransporationLayer
              checked={mapOverlayNames.includes("Transportation")}
            />
            <BoundariesLayer
              checked={mapOverlayNames.includes("Boundaries and Places")}
            />
          </LayersControl>
          <MapFullscreenToggle containerRef={mapContainerRef} />
          <MeterMapColorLegend />
        </MapContainer>
      </Box>
      {/* Loading and empty states */}
      {meterMarkers.isLoading && (
        <Box py={2}>
          <Typography
            variant="h6"
            sx={{
              pointerEvents: "none",
              userSelect: "none",
            }}
          >
            Loading meter markers...
          </Typography>
        </Box>
      )}
      {meterMarkers.isSuccess && meterMarkers?.data.length === 0 && (
        <Box py={2}>
          <Typography
            variant="h6"
            color="text.secondary"
            sx={{
              pointerEvents: "none",
              userSelect: "none",
            }}
          >
            No meters found for that search.
          </Typography>
        </Box>
      )}
      {/* Error */}
      {meterMarkers.isError && (
        <Box py={2}>
          <Typography
            variant="h6"
            color="error"
            sx={{
              pointerEvents: "none",
              userSelect: "none",
            }}
          >
            Failed to load meters: {meterMarkers.error.message}
          </Typography>
        </Box>
      )}
    </>
  );
}
