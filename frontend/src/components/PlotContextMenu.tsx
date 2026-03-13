import { ReactNode, MouseEvent, useState } from "react";
import { Box, Menu, MenuItem } from "@mui/material";

type ContextMenuPosition = {
  mouseX: number;
  mouseY: number;
};

type PlotDragMode = "pan" | "zoom";

export const PlotContextMenu = ({
  children,
  onResetAxes,
  dragMode,
  onToggleDragMode,
}: {
  children: ReactNode;
  onResetAxes: () => void;
  dragMode?: PlotDragMode;
  onToggleDragMode?: () => void;
}) => {
  const [contextMenu, setContextMenu] = useState<ContextMenuPosition | null>(
    null,
  );

  const handleContextMenu = (event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    setContextMenu({
      mouseX: event.clientX + 2,
      mouseY: event.clientY - 6,
    });
  };

  const handleClose = () => {
    setContextMenu(null);
  };

  const handleResetAxes = () => {
    handleClose();
    onResetAxes();
  };

  const handleToggleDragMode = () => {
    handleClose();
    onToggleDragMode?.();
  };

  return (
    <Box sx={{ width: "100%", height: "100%" }} onContextMenu={handleContextMenu}>
      {children}
      <Menu
        open={contextMenu !== null}
        onClose={handleClose}
        anchorReference="anchorPosition"
        elevation={0}
        slotProps={{
          paper: {
            sx: {
              mt: 0.5,
              minWidth: 160,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1.5,
              boxShadow:
                "0 10px 30px rgba(15, 23, 42, 0.14), 0 2px 8px rgba(15, 23, 42, 0.08)",
            },
          },
        }}
        MenuListProps={{
          dense: true,
          disablePadding: true,
        }}
        anchorPosition={
          contextMenu
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        {dragMode && onToggleDragMode && (
          <MenuItem
            onClick={handleToggleDragMode}
            sx={{
              px: 1.5,
              py: 0.75,
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Switch to {dragMode === "pan" ? "zoom" : "pan"}
          </MenuItem>
        )}
        <MenuItem
          onClick={handleResetAxes}
          sx={{
            px: 1.5,
            py: 0.75,
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          Reset axes
        </MenuItem>
      </Menu>
    </Box>
  );
};
