import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Button,
  Box,
  Divider,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { useNavigate } from "react-router-dom";
import { useAuthUser, useSignOut } from "react-auth-kit";
import { useState } from "react";
import { Badge, Engineering, Face, Login } from "@mui/icons-material";

export default function Topbar({ onMenuClick, sx }: { onMenuClick: () => void; sx?: any }) {
  const navigate = useNavigate();
  const signOut = useSignOut();
  const authUser = useAuthUser();
  const role = authUser()?.user_role?.name;
  const isLoggedIn = !!authUser();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const fullSignOut = () => {
    navigate("/");
    signOut();
  };

  const renderRoleIcon = () => {
    switch (role) {
      case "Admin":
        return <Badge fontSize="small" />;
      case "Technician":
        return <Engineering fontSize="small" />;
      default:
        return <Face fontSize="small" />;
    }
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        backgroundColor: "white",
        ...sx,
      }}
    >
      <Toolbar sx={{ justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <IconButton
            edge="start"
            color="inherit"
            onClick={onMenuClick}
            sx={{ mr: 1, color: "darkblue" }}
          >
            <MenuIcon />
          </IconButton>
          <Typography
            variant="h6"
            noWrap
            sx={{
              color: "darkblue",
              cursor: "pointer",
              fontWeight: "bold",
              ml: 1,
              fontSize: {
                xs: "1.5rem",
                md: "1.625rem",
                lg: "1.75rem",
                xl: "2rem",
              },
            }}
            onClick={() => navigate("/")}
          >
            Meter Manager
          </Typography>
        </Box>

        {isLoggedIn ? (
          <Box>
            <Button
              color="inherit"
              onClick={handleMenuOpen}
              sx={{
                textTransform: "uppercase",
                fontWeight: "bolder",
                backgroundColor: "darkblue",
                color: "white",
                "&:hover": {
                  backgroundColor: "#00008b",
                },
              }}
            >
              {authUser()?.username ?? "Username"}
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  ml: 1,
                  bgcolor: "rgb(89,90,182)",
                }}
              >
                {renderRoleIcon()}
              </Avatar>
            </Button>
            <Menu
              id="profile-menu"
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
              transformOrigin={{ horizontal: "right", vertical: "top" }}
            >
              <MenuItem
                disabled
                sx={{
                  opacity: 1,
                  fontWeight: "bold",
                  color: "darkblue",
                  "&.Mui-disabled": { opacity: 1 },
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: "0.5rem", textTransform: 'uppercase' }}>
                  <Typography variant="body2" fontWeight="bold" color="darkblue">
                    Role: {role ?? "Unknown"}
                  </Typography>
                </Box>
              </MenuItem>
              <Divider />
              <MenuItem
                onClick={() => {
                  navigate("/settings")
                  handleMenuClose()
                }}
              >
                Settings
              </MenuItem>
              <MenuItem onClick={() => {
                fullSignOut()
                handleMenuClose()
              }}>Logout</MenuItem>
            </Menu>
          </Box>
        )
          : (
            <Button
              onClick={() => navigate("/login")}
              sx={{
                textTransform: "uppercase",
                fontWeight: "bolder",
                backgroundColor: "darkblue",
                color: "white",
                "&:hover": {
                  backgroundColor: "#00008b",
                },
              }}
            >
              Login
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  ml: 1,
                  bgcolor: "rgb(89,90,182)",
                }}
              >
                <Login fontSize="small" />
              </Avatar>
            </Button>
          )}
      </Toolbar>
    </AppBar>
  );
}

