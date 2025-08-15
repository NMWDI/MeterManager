import { useEffect } from "react";
import { useDebounce } from "use-debounce";
import {
  MapContainer,
  TileLayer,
  Tooltip,
  GeoJSON,
  LayersControl,
  Marker,
  Pane,
} from "react-leaflet";
import { MeterMapDTO } from "../../../interfaces";

import L from "leaflet";
import { useLeafletContext } from "@react-leaflet/core";
import { FeatureCollection } from "geojson";

import "leaflet/dist/leaflet.css";
import "@changey/react-leaflet-markercluster/dist/styles.min.css";
import "../../../css/map.css";
import { useGetMeterLocations } from "../../../service/ApiServiceNew";
import * as tr_data from "../../../data/RoswellTR_v2.json";
import * as ss_data from "../../../data/RoswellSS.json";

import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import { Box, Typography } from "@mui/material";
import MarkerClusterGroup from "@changey/react-leaflet-markercluster";

const DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow });
L.Marker.prototype.options.icon = DefaultIcon;

interface MeterSelectionMapProps {
  meterSearch: string;
  onMeterSelection: Function;
}

// Define marker colors which are based on the year of the last PM (July - June)
const pm_colors: { [key: string]: string } = {
  "2020/2021": "brown",
  "2021/2022": "green",
  "2022/2023": "purple",
  "2023/2024": "turquoise",
  "2024/2025": "red",
  "2025/2026": "white",
  "2026/2027": "yellow",
  "2027/2028": "brown",
  "2028/2029": "blue",
};

// Color legend component
function ColorLegend() {
  const context = useLeafletContext();

  useEffect(() => {
    const legend = new L.Control({ position: "bottomleft" });
    legend.onAdd = function() {
      const div = L.DomUtil.create("div", "info legend");
      div.innerHTML = "<h4>PM Season</h4>";
      for (const season in pm_colors) {
        div.innerHTML += `<i style="background:${pm_colors[season]}"></i> ${season}<br>`;
      }
      return div;
    };

    const container = context.map;
    container.addControl(legend);

    return () => {
      container.removeControl(legend);
    };
  }, [context.map]);

  return null;
}

// Function for getting color from last PM
function getMeterColor(last_pm: string) {
  const last_pm_date = new Date(last_pm);
  if (last_pm_date.getMonth() >= 7) {
    return pm_colors[
      last_pm_date.getFullYear() + "/" + (last_pm_date.getFullYear() + 1)
    ];
  } else {
    return pm_colors[
      last_pm_date.getFullYear() - 1 + "/" + last_pm_date.getFullYear()
    ];
  }
}

// Static geojson data
const trData: FeatureCollection = tr_data as FeatureCollection;
const ssData: FeatureCollection = ss_data as FeatureCollection;

export default function MeterSelectionMap({
  onMeterSelection,
  meterSearch,
}: MeterSelectionMapProps) {
  const [meterSearchDebounced] = useDebounce(meterSearch, 250);
  const meterMarkers = useGetMeterLocations(meterSearchDebounced);
  const mapStyle = { height: "100%", width: "100%" };

  return (
    <>
      <MapContainer center={[33, -104.0]} zoom={8} style={mapStyle} maxZoom={18}>
        <LayersControl position="topleft">
          {/* Base Layers */}
          <LayersControl.BaseLayer name="Satellite">
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution="Imagery © Esri, Earthstar Geographics"
            />
          </LayersControl.BaseLayer>

          <LayersControl.BaseLayer checked name="OpenStreetMap">
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />
          </LayersControl.BaseLayer>

          {/* Markers Cluster Overlay */}
          <LayersControl.Overlay name="Meters" checked>
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
                  const color = meter.last_pm ? getMeterColor(meter.last_pm) : "black";

                  return (
                    <Marker
                      key={meter.id}
                      position={[meter.location.latitude, meter.location.longitude]}
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
          <LayersControl.Overlay name="Section">
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
          <LayersControl.Overlay name="Township Range">
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
        </LayersControl>

        <ColorLegend />
      </MapContainer>

      {/* Loading and empty states */}
      {meterMarkers.isLoading && (
        <Box py={2}>
          <Typography variant="h6">Loading meter markers...</Typography>
        </Box>
      )}

      {meterMarkers.isSuccess && meterMarkers.data.length === 0 && (
        <Box py={2}>
          <Typography variant="h6" color="text.secondary">
            No meters found for that search.
          </Typography>
        </Box>
      )}
    </>
  );
}
