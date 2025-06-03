import { Grid, SvgIconProps, Box, Typography } from "@mui/material";
import TableViewIcon from "@mui/icons-material/TableView";
import { Link, useLocation } from "react-router-dom";

export const NavLink = ({
  disabled = false,
  route,
  label,
  Icon,
}: {
  disabled?: boolean;
  route: string;
  label: string;
  Icon?: React.ComponentType<SvgIconProps>;
}) => {
  const location = useLocation();
  const isActive = location.pathname === route;

  const content = (
    <Box
      sx={{
        px: 1,
        py: 0.5,
        borderRadius: "10px",
        ml: 0.5,
        display: "flex",
        alignItems: "center",
        color: disabled ? "#aaa" : "#555",
        fontSize: "16px",
        textDecoration: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        backgroundColor: isActive ? "rgb(240,240,255)" : "transparent",
        "&:hover": {
          backgroundColor: !disabled ? "rgb(240,240,255)" : undefined,
        },
      }}
    >
      {Icon ? (
        <Icon sx={{ fontSize: 20, mr: 1 }} />
      ) : (
        <TableViewIcon sx={{ fontSize: 20, mr: 1 }} />
      )}
      <Typography variant="body2">{label}</Typography>
    </Box>
  );

  return (
    <Grid item>
      {disabled ? (
        content
      ) : (
        <Link to={route} style={{ textDecoration: "none" }}>
          {content}
        </Link>
      )}
    </Grid>
  );
};
