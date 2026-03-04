import { LayersControl, TileLayer } from "react-leaflet";

export const BoundariesLayer = () => (
  <LayersControl.Overlay name="Boundaries and Places">
    <TileLayer
      url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
      attribution="Imagery © Esri, Earthstar Geographics"
    />
  </LayersControl.Overlay>
);
