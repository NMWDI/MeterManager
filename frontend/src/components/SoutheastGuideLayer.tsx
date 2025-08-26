// SoutheastGuideLayer.tsx
import * as L from "leaflet";
import { LayersControl, Pane, FeatureGroup, Rectangle, Polyline, Marker, Tooltip } from "react-leaflet";

const NM_LAT_MIN = 31.3325;
const NM_LAT_MAX = 37.0;
const NM_LON_MIN = -109.05;
const NM_LON_MAX = -103.0;

const MID_LAT = (NM_LAT_MIN + NM_LAT_MAX) / 2;
const MID_LON = (NM_LON_MIN + NM_LON_MAX) / 2;

// Southeast quadrant bounds
const SE_LAT_MIN = NM_LAT_MIN;
const SE_LAT_MAX = MID_LAT;
const SE_LON_MIN = MID_LON;
const SE_LON_MAX = NM_LON_MAX;

const SE_MID_LAT = (SE_LAT_MIN + SE_LAT_MAX) / 2;
const SE_MID_LON = (SE_LON_MIN + SE_LON_MAX) / 2;

// Helpers
const rectBounds: [[number, number], [number, number]] = [
  [SE_LAT_MIN, SE_LON_MIN],
  [SE_LAT_MAX, SE_LON_MAX],
];

const horizLine = [
  [SE_MID_LAT, SE_LON_MIN],
  [SE_MID_LAT, SE_LON_MAX],
] as [number, number][];

const vertLine = [
  [SE_LAT_MIN, SE_MID_LON],
  [SE_LAT_MAX, SE_MID_LON],
] as [number, number][];

const labelIcon = (text: string) =>
  L.divIcon({
    className: "",
    html: `<div style="
      font-size: 12px;
      font-weight: 700;
      color: #0b3b86;
      background: rgba(255,255,255,0.7);
      border: 1px solid rgba(11,59,134,0.25);
      border-radius: 8px;
      padding: 2px 6px;
      pointer-events: none;
      white-space: nowrap;
      backdrop-filter: blur(2px);
    ">${text}</div>`,
  });

export const SoutheastGuideLayer = () =>
  (
    <LayersControl.Overlay name="SE Quadrant Guide" checked>
      {/* Lower than your GeoJSON panes (you used 600/625); markers still clickable above */}
      <Pane name="se_quadrant_guide" style={{ zIndex: 550 }}>
        <FeatureGroup>
          {/* SE quadrant rectangle */}
          <Rectangle
            bounds={rectBounds}
            pathOptions={{
              color: "#1976d2",
              weight: 2,
              fillColor: "#1976d2",
              fillOpacity: 0.06,
            }}
          />

          {/* Midlines */}
          <Polyline
            positions={horizLine}
            pathOptions={{ color: "#1976d2", weight: 2, dashArray: "6 6" }}
          />
          <Polyline
            positions={vertLine}
            pathOptions={{ color: "#1976d2", weight: 2, dashArray: "6 6" }}
          />

          {/* Labels (placed toward the center of each half) */}
          <Marker position={[SE_LAT_MAX - (SE_LAT_MAX - SE_MID_LAT) / 2, SE_MID_LON]} icon={labelIcon("North")} />
          <Marker position={[SE_LAT_MIN + (SE_MID_LAT - SE_LAT_MIN) / 2, SE_MID_LON]} icon={labelIcon("South")} />
          <Marker position={[SE_MID_LAT, SE_LON_MAX - (SE_LON_MAX - SE_MID_LON) / 2]} icon={labelIcon("East")} />
          <Marker position={[SE_MID_LAT, SE_LON_MIN + (SE_MID_LON - SE_LON_MIN) / 2]} icon={labelIcon("West")} />

          {/* Optional: center dot where lines cross */}
          {/* <Marker position={[SE_MID_LAT, SE_MID_LON]} icon={L.divIcon({ html: '<div style="width:8px;height:8px;border-radius:50%;background:#1976d2;border:2px solid white"></div>' })} /> */}
        </FeatureGroup>
      </Pane>
    </LayersControl.Overlay>
  );
