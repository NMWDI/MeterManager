import L from "leaflet";
import iconRed from "../../../assets/leaflet/marker-icon-red.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

export const RedMapIcon = L.icon({
  iconUrl: iconRed,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
