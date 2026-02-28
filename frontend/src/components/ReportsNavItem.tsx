import { Dispatch, SetStateAction, useState } from "react";
import {
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import { Assessment, ExpandLess, ExpandMore } from "@mui/icons-material";
import { useNavigate } from "@tanstack/react-router";
import { useIsActiveRoute } from "@/hooks";

export function ReportsNavItem({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
}) {
  const navigate = useNavigate();
  const [clickTimer, setClickTimer] = useState<NodeJS.Timeout | null>(null);
  const isActive = useIsActiveRoute("/reports");

  const handleClick = () => {
    if (clickTimer) {
      clearTimeout(clickTimer);
      setClickTimer(null);
    }
    const timer = setTimeout(() => {
      setOpen((prev) => !prev);
      setClickTimer(null);
    }, 200);
    setClickTimer(timer);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (clickTimer) {
      clearTimeout(clickTimer);
      setClickTimer(null);
    }
    e.stopPropagation();
    setOpen(false);
    navigate({ to: "/reports" });
  };

  return (
    <ListItem disablePadding dense>
      <ListItemButton
        selected={isActive}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        sx={{
          borderRadius: "10px",
          "&.Mui-selected": {
            backgroundColor: "rgb(240,240,255)",
            fontWeight: "bold",
          },
        }}
      >
        <ListItemIcon sx={{ minWidth: 36 }}>
          <Assessment fontSize="small" />
        </ListItemIcon>
        <ListItemText
          primary="Reports"
          primaryTypographyProps={{
            fontSize: 14,
            fontWeight: isActive ? "bold" : "normal",
          }}
        />
        {open ? <ExpandLess /> : <ExpandMore />}
      </ListItemButton>
    </ListItem>
  );
}
