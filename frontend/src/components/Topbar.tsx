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
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthUser, useSignOut } from "react-auth-kit";
import { useRef, useState } from "react";

export default function Topbar({ onMenuClick, sx }: { onMenuClick: () => void; sx?: any }) {
  const location = useLocation();
  const navigate = useNavigate();
  const signOut = useSignOut();
  const authUser = useAuthUser();

  const profileMenuRef = useRef<HTMLButtonElement | null>(null);
  const [isProfileMenuOpen, setProfileMenuOpen] = useState(false);

  const fullSignOut = () => {
    navigate("/");
    signOut();
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
            onClick={() => navigate("/home")}
          >
            Meter Manager
          </Typography>
        </Box>

        {location.pathname !== "/" && (
          <Box>
            <Button
              color="inherit"
              ref={profileMenuRef}
              onClick={() => setProfileMenuOpen(true)}
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
                sx={{ width: 32, height: 32, ml: 1, bgcolor: "rgb(89,90,182)" }}
              >
                {authUser()?.username?.charAt(0) ?? "U"}
              </Avatar>
            </Button>
            <Menu
              id="profile-menu"
              anchorEl={profileMenuRef.current}
              open={isProfileMenuOpen}
              onClose={() => setProfileMenuOpen(false)}
              anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
              transformOrigin={{ horizontal: "right", vertical: "top" }}
            >
              <MenuItem
                onClick={() => {
                  navigate("/settings");
                  setProfileMenuOpen(false);
                }}
              >
                Settings
              </MenuItem>
              <MenuItem onClick={fullSignOut}>Logout</MenuItem>
            </Menu>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
}

