import { LayersControl, TileLayer } from "react-leaflet"

export const OpenStreetMapLayer = () => (
  <LayersControl.BaseLayer checked name="OpenStreetMap">
    <TileLayer
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      attribution="&copy; OpenStreetMap contributors"
    />
  </LayersControl.BaseLayer>
)
