import { LayersControl, TileLayer } from "react-leaflet";

export const SatelliteLayer = ({ checked = false }: { checked?: boolean }) => (
  <LayersControl.BaseLayer checked={checked} name="Satellite">
    <TileLayer
      url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
      attribution="Labels © Esri"
    />
  </LayersControl.BaseLayer>
);
