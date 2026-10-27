import * as L from "leaflet";
import { useEffect, useRef } from "react";
import {
  useChloridesReportGeometry,
  type ChloridesReportGeometry,
} from "@/service/chloridesReport";
import {
  LayersControl,
  Pane,
  FeatureGroup,
  GeoJSON,
  Rectangle,
  Marker,
  CircleMarker,
  Tooltip,
  useMap,
} from "react-leaflet";

export const ChloridesGuideFit = ({
  geometry,
  preserveView,
}: {
  geometry: ChloridesReportGeometry;
  preserveView: boolean;
}) => {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (!preserveView && !fitted.current) {
      const west = geometry.bbox[0],
        south = geometry.bbox[1];
      const east = geometry.bbox[2],
        north = geometry.bbox[3];
      map.fitBounds(
        [
          [south, west],
          [north, east],
        ],
        { padding: [24, 24] },
      );
      fitted.current = true;
    }
  }, [geometry, map, preserveView]);
  return null;
};

const labelIcon = (text: string) =>
  L.divIcon({
    className: "chlorides-report-label",
    iconSize: [0, 0],
    html: `<div style="display:inline-block;font-size:12px;font-weight:700;color:#0b3b86;background:rgba(255,255,255,.85);border:1px solid #1976d2;border-radius:8px;padding:2px 6px;white-space:nowrap;transform:translate(-50%,-50%)">${text}</div>`,
  });

export const SoutheastGuideLayer = ({
  checked = false,
  geometry: suppliedGeometry,
}: {
  checked?: boolean;
  geometry?: ChloridesReportGeometry;
}) => {
  const geometryQuery = useChloridesReportGeometry(!suppliedGeometry);
  const geometry = suppliedGeometry ?? geometryQuery.data;
  if (!geometry) return null;
  return (
    <LayersControl.Overlay
      checked={checked}
      name="Clorides Report Region Guide"
    >
      <Pane name="se_quadrant_guide" style={{ zIndex: 550 }}>
        <FeatureGroup>
          <Rectangle
            bounds={[
              [geometry.bbox[1], geometry.bbox[0]],
              [geometry.bbox[3], geometry.bbox[2]],
            ]}
            pathOptions={{ color: "#1976d2", weight: 2, fill: false }}
          />
          {geometry.features.map((feature) => {
            const properties = feature.properties;
            if (
              properties.kind === "anchor" &&
              feature.geometry.type === "Point"
            ) {
              const [longitude, latitude] = feature.geometry.coordinates;
              return (
                <CircleMarker
                  key={properties.id}
                  center={[latitude, longitude]}
                  radius={4}
                  pathOptions={{ color: "#0b3b86", fillOpacity: 1 }}
                >
                  <Tooltip>
                    {properties.label}: {properties.coordinate_label}
                  </Tooltip>
                </CircleMarker>
              );
            }
            return (
              <FeatureGroup key={properties.id}>
                <GeoJSON
                  data={feature}
                  style={{
                    color: "#1976d2",
                    weight: 2,
                    fillOpacity: properties.kind === "region" ? 0.06 : 0,
                    stroke: properties.kind !== "region",
                    dashArray:
                      properties.kind === "divider" ? "6 6" : undefined,
                  }}
                >
                  <Tooltip>{properties.label}</Tooltip>
                </GeoJSON>
                {properties.label_position && (
                  <Marker
                    position={[
                      properties.label_position[1],
                      properties.label_position[0],
                    ]}
                    icon={labelIcon(properties.label)}
                    interactive={false}
                  />
                )}
              </FeatureGroup>
            );
          })}
        </FeatureGroup>
      </Pane>
    </LayersControl.Overlay>
  );
};
