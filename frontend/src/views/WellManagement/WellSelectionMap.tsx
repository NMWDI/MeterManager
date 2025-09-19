import { useEffect } from "react";
import { useDebounce } from "use-debounce";
import { LayersControl, MapContainer, Marker, Tooltip } from "react-leaflet";
import { Box, Typography } from "@mui/material";
import { useGetWellLocations } from "../../service/ApiServiceNew";
import { Well } from "../../interfaces";
import { OpenStreetMapLayer, SatelliteLayer, SoutheastGuideLayer, WellMapLegend } from "../../components";
import { BlueMapIcon, RedMapIcon, BlackMapIcon } from "../../components/MapIcons";
import { WellStatus } from "../../enums";

import L from "leaflet";
import "leaflet/dist/leaflet.css";

// @ts-ignore
import MarkerClusterGroup from "@changey/react-leaflet-markercluster";
import "@changey/react-leaflet-markercluster/dist/styles.min.css";

export default function WellSelectionMap({
  setSelectedWell,
  wellSearchQueryProp,
}: {
  wellSearchQueryProp: string;
  setSelectedWell: Function;
}) {
  const [wellSearchDebounced] = useDebounce(wellSearchQueryProp, 250);
  const wellQuery = useGetWellLocations(wellSearchDebounced);

  useEffect(() => {
    if (wellQuery.hasNextPage && !wellQuery.isFetchingNextPage) {
      wellQuery.fetchNextPage();
    }
  }, [wellQuery.hasNextPage, wellQuery.isFetchingNextPage]);

  const wellMarkers = wellQuery.data?.pages.flat() ?? [];

  return (
    <>
      <Box
        sx={{
          borderRadius: 2,
          overflow: 'hidden',
          height: '100%',
          minHeight: 500,
          '& .leaflet-container': { height: '100%', width: '100%' },
        }}
      >
        <MapContainer
          center={[33, -104.0]}
          zoom={8}
          style={{ height: '100%', width: '100%', minHeight: 500 }}
          maxZoom={18}
        >
          <LayersControl position="topleft">
            {/* Base Layers */}
            <SatelliteLayer />
            <OpenStreetMapLayer />
            <SoutheastGuideLayer />

            {/* Wells Cluster Overlay */}
            <LayersControl.Overlay name="Wells" checked>
              <MarkerClusterGroup
                chunkedLoading
                maxClusterRadius={35}
                disableClusteringAtZoom={12}
                iconCreateFunction={(cluster: any) => {
                  const count = cluster.getChildCount();
                  return L.divIcon({
                    html: `<div style="
                      background-color: rgba(0, 123, 255, 0.8);
                      color: white;
                      width: 40px;
                      height: 40px;
                      border-radius: 50%;
                      display: flex;
                      justify-content: center;
                      align-items: center;
                      font-weight: bold;
                      border: 2px solid white;
                    ">${count}</div>`,
                    className: "",
                    iconSize: [40, 40],
                  });
                }}
              >
                {wellQuery.isSuccess &&
                  wellMarkers.map((well: Well) => (
                    <Marker
                      key={well.id}
                      position={[
                        well.location?.latitude,
                        well.location?.longitude,
                      ]}
                      eventHandlers={{
                        click: () => setSelectedWell(well),
                      }}
                      icon={getWellIcon(well)}
                    >
                      <Tooltip>
                        {well.name || well.ra_number || well.id}
                      </Tooltip>
                    </Marker>
                  ))}
              </MarkerClusterGroup>
              <WellMapLegend />
            </LayersControl.Overlay>
          </LayersControl>
        </MapContainer>
      </Box>
      {/* Loading first page */}
      {wellQuery.isLoading && (
        <Box py={2}>
          <Typography variant="h6" sx={{
            pointerEvents: "none",
            userSelect: "none",
          }}>Loading well markers...</Typography>
        </Box>
      )}
      {/* Loading additional pages */}
      {wellQuery.isFetchingNextPage && (
        <Box py={2}>
          <Typography variant="h6" sx={{
            pointerEvents: "none",
            userSelect: "none",
          }}>Loading more wells...</Typography>
        </Box>
      )}
      {wellQuery.isSuccess && wellMarkers.length === 0 && (
        <Box py={2}>
          <Typography variant="h6" color="text.secondary" sx={{
            pointerEvents: "none",
            userSelect: "none",
          }}>
            No wells found for that search.
          </Typography>
        </Box>
      )}
      {/* Error */}
      {wellQuery.isError && (
        <Box py={2}>
          <Typography variant="h6" color="error" sx={{
            pointerEvents: "none",
            userSelect: "none",
          }}>
            Failed to load wells: {wellQuery.error.message}
          </Typography>
        </Box>
      )}
    </>
  );
}

const getWellIcon = (well: Well) => {
  if (well.well_status_id === WellStatus.PLUGGED) {
    return BlackMapIcon;
  }
  if (well.chloride_group_id != null) {
    return RedMapIcon;
  }
  return BlueMapIcon;
}

