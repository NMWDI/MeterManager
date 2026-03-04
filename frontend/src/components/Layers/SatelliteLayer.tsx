import { LayersControl, TileLayer } from "react-leaflet";

export const SatelliteLayer = () => (
  <LayersControl.BaseLayer checked name="Satellite">
    <TileLayer
      url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
      attribution="Labels © Esri"
    />
  </LayersControl.BaseLayer>
);
