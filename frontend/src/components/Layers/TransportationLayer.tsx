import { LayersControl, TileLayer } from "react-leaflet";

export const TransporationLayer = () => (
  <LayersControl.Overlay name="Transportation">
    <TileLayer
      url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}"
      attribution="Reference © Esri"
    />
  </LayersControl.Overlay>
);
