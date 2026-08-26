import { useEffect } from "react";
import { useLeafletContext } from "@react-leaflet/core";
import L from "leaflet";
import { PM_SEASON_COLORS } from "@/constants";

export const MeterMapColorLegend = () => {
  const context = useLeafletContext();

  useEffect(() => {
    const legend = new L.Control({ position: "bottomleft" });

    legend.onAdd = function () {
      const div = L.DomUtil.create("div", "info legend");

      div.style.background = "white";
      div.style.padding = "8px";
      div.style.borderRadius = "8px";
      div.style.boxShadow = "0 2px 6px rgba(0,0,0,0.3)";
      div.style.fontSize = "14px";
      div.style.lineHeight = "14px";

      const title = L.DomUtil.create("h4", "", div);
      title.textContent = "PM Season";
      title.style.margin = "0 0 8px 0";

      for (const season in PM_SEASON_COLORS) {
        const row = L.DomUtil.create("div", "", div);
        row.style.display = "flex";
        row.style.alignItems = "center";
        row.style.marginBottom = "5px";

        const colorBox = L.DomUtil.create("div", "", row);
        colorBox.style.width = "20px";
        colorBox.style.height = "20px";
        colorBox.style.background = PM_SEASON_COLORS[season];
        colorBox.style.marginRight = "8px";
        colorBox.style.border = "1px solid #ccc";
        colorBox.style.borderRadius = "4px";

        const label = L.DomUtil.create("span", "", row);
        label.textContent = season;
      }

      return div;
    };

    const container = context.map;
    container.addControl(legend);

    return () => {
      container.removeControl(legend);
    };
  }, [context.map]);

  return null;
};
