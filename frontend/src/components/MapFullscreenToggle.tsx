import { useEffect, useState, type RefObject } from "react";
import { Fullscreen, FullscreenExit } from "@mui/icons-material";
import { IconButton, Tooltip } from "@mui/material";
import { useMap } from "react-leaflet";

type MapFullscreenToggleProps = {
  containerRef: RefObject<HTMLElement | null>;
};

const getFullscreenElement = () =>
  document.fullscreenElement as HTMLElement | null;

const MapFullscreenSync = () => {
  const map = useMap();

  useEffect(() => {
    const syncMapSize = () => {
      window.setTimeout(() => {
        map.invalidateSize();
      }, 0);
    };

    document.addEventListener("fullscreenchange", syncMapSize);
    window.addEventListener("resize", syncMapSize);

    return () => {
      document.removeEventListener("fullscreenchange", syncMapSize);
      window.removeEventListener("resize", syncMapSize);
    };
  }, [map]);

  return null;
};

export const MapFullscreenToggle = ({
  containerRef,
}: MapFullscreenToggleProps) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const syncFullscreenState = () => {
      setIsFullscreen(getFullscreenElement() === containerRef.current);
    };

    syncFullscreenState();
    document.addEventListener("fullscreenchange", syncFullscreenState);

    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreenState);
    };
  }, [containerRef]);

  const handleToggleFullscreen = async () => {
    const container = containerRef.current;

    if (!container) return;

    if (getFullscreenElement() === container) {
      await document.exitFullscreen();
      return;
    }

    await container.requestFullscreen();
  };

  return (
    <>
      <MapFullscreenSync />
      <Tooltip
        title={isFullscreen ? "Exit full screen" : "Enter full screen"}
        placement="left"
      >
        <IconButton
          aria-label={isFullscreen ? "Exit full screen map" : "Full screen map"}
          onClick={() => {
            void handleToggleFullscreen();
          }}
          sx={{
            position: "absolute",
            top: 10,
            right: 10,
            zIndex: 1000,
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            border: "1px solid rgba(0, 0, 0, 0.2)",
            boxShadow: "0 1px 5px rgba(0, 0, 0, 0.35)",
            "&:hover": {
              backgroundColor: "rgba(255, 255, 255, 1)",
            },
          }}
        >
          {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
        </IconButton>
      </Tooltip>
    </>
  );
};
