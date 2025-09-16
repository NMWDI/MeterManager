import L from "leaflet";
import iconBlack from "./../../assets/leaflet/marker-icon-black.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

export const BlackMapIcon = L.icon({
  iconUrl: iconBlack,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
