import { SvgIconProps, Badge, ListItem, ListItemButton, ListItemIcon, ListItemText } from "@mui/material";
import TableViewIcon from "@mui/icons-material/TableView";
import { Link, type LinkProps } from "react-router-dom";
import { useIsActiveRoute } from "../hooks";

export const NavLink = ({
  disabled = false,
  route,
  label,
  icon: Icon,
  badgeContent,
  subItem = false,
}: {
  disabled?: boolean;
  route: LinkProps["to"];
  label: string;
  icon?: React.ComponentType<SvgIconProps>;
  badgeContent?: number;
  subItem?: boolean;
}) => {
  const isActive = useIsActiveRoute(route);

  return (
    <ListItem disablePadding dense>
      <ListItemButton
        selected={isActive}
        component={Link}
        to={route}
        disabled={disabled}
        sx={{
          ml: subItem ? 2 : 0,
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
        <ListItemText
          primary={label}
          primaryTypographyProps={{
            fontSize: 14,
            fontWeight: isActive ? "bold" : "normal",
            color: disabled ? "text.disabled" : "text.primary",
          }}
        />
      </ListItemButton>
    </ListItem>
  );
};
