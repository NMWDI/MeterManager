import { SvgIconProps, Badge, ListItem, ListItemButton, ListItemIcon, ListItemText } from "@mui/material";
import TableViewIcon from "@mui/icons-material/TableView";
import { Link, useLocation, type LinkProps } from "react-router-dom";

export const NavLink = ({
  disabled = false,
  route,
  label,
  Icon,
  badgeContent,
}: {
  disabled?: boolean;
  route: LinkProps["to"];
  label: string;
  Icon?: React.ComponentType<SvgIconProps>;
  badgeContent?: number;
}) => {
  const location = useLocation();
  const currentPath = location.pathname;
  const targetPath = typeof route === "string"
    ? route.split("?")[0].split("#")[0]
    : route.pathname ?? "";

  const isActive = currentPath === targetPath;

  return (
    <ListItem disablePadding dense>
      <ListItemButton
        selected={isActive}
        component={Link}
        to={route}
        disabled={disabled}
        sx={{
          borderRadius: "10px",
          "&.Mui-selected": {
            backgroundColor: "rgb(240,240,255)",
            fontWeight: "bold",
          },
        }}
      >
        <ListItemIcon sx={{ minWidth: 36 }}>
          {Icon ? (
            <Badge
              badgeContent={badgeContent}
              color="primary"
              invisible={!badgeContent || badgeContent === 0}
            >
              <Icon fontSize="small" />
            </Badge>
          ) : (
            <TableViewIcon fontSize="small" />
          )}
        </ListItemIcon>
        <ListItemText primary={label} />
      </ListItemButton>
    </ListItem>
  );
};
