import React from "react";
import {
  BlackMapIcon,
  BlueMapIcon,
  RedMapIcon,
} from "./icons";

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
          src={BlueMapIcon.options.iconUrl as string}
          alt="Well"
          style={{ width: "12.5px", height: "20.1px", marginRight: "8px" }}
        />
        <span>Well</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", marginBottom: "6px" }}>
        <img
          src={RedMapIcon.options.iconUrl as string}
          alt="Chloride Monitored Well"
          style={{ width: "12.5px", height: "20.1px", marginRight: "8px" }}
        />
        <span>Chloride Monitored Well</span>
      </div>
      <div style={{ display: "flex", alignItems: "center" }}>
        <img
          src={BlackMapIcon.options.iconUrl as string}
          alt="Chloride Monitored Well"
          style={{ width: "12.5px", height: "20.1px", marginRight: "8px" }}
        />
        <span>Plugged Well</span>
      </div>
    </div>
  );
};
