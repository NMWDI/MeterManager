import React from "react";
import L from "leaflet";
import iconBlue from "leaflet/dist/images/marker-icon.png";
import iconRed from "../assets/leaflet/marker-icon-red.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

const blueIcon = L.icon({
  iconUrl: iconBlue,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const redIcon = L.icon({
  iconUrl: iconRed,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export const WellMapLegend: React.FC = () => {
  return (
    <div
      style={{
        position: "absolute",
        bottom: "30px",
        left: "10px",
        background: "white",
        padding: "10px",
        borderRadius: "8px",
        boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
        fontSize: "14px",
        zIndex: 1000,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", marginBottom: "6px" }}>
        <img
          src={blueIcon.options.iconUrl as string}
          alt="Well"
          style={{ width: "12.5px", height: "20.1px", marginRight: "8px" }}
        />
        <span>Well</span>
      </div>
      <div style={{ display: "flex", alignItems: "center" }}>
        <img
          src={redIcon.options.iconUrl as string}
          alt="Chloride Monitored Well"
          style={{ width: "12.5px", height: "20.1px", marginRight: "8px" }}
        />
        <span>Chloride Monitored Well</span>
      </div>
    </div>
  );
};

