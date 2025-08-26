import { LayersControl, TileLayer } from "react-leaflet"

export const SatelliteLayer = () => (
  <LayersControl.BaseLayer name="Satellite">
    <TileLayer
      url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
      attribution="Imagery © Esri, Earthstar Geographics"
    />
  </LayersControl.BaseLayer>
)
