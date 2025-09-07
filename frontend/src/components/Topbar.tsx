import { useState, useMemo } from "react";
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
  ListItemIcon,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { useNavigate } from "react-router-dom";
import { useAuthUser, useSignOut } from "react-auth-kit";
import { createAvatar } from '@dicebear/core';
import { identicon } from '@dicebear/collection';
import { Login, Logout, Settings } from "@mui/icons-material";
import { RoleChip } from "./RoleChip";
import { getRoleColor } from "../utils";

export default function Topbar({ open, onMenuClick, sx }: { open: boolean, onMenuClick: () => void; sx?: any }) {
  const navigate = useNavigate();
  const signOut = useSignOut();
  const authUser = useAuthUser();
  const role: string = authUser()?.user_role?.name;
  const isLoggedIn = !!authUser();
  const avatar = useMemo(() => {
    return createAvatar(identicon, {
      size: 128,
      seed: authUser()?.full_name
    }).toDataUri();
  }, []);

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
          {!open ?
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
            : null}
        </Box>

        {isLoggedIn ? (
          <Box>
            <Button
              color={getRoleColor(role)}
              variant="contained"
              onClick={handleMenuOpen}
              sx={{
                textTransform: "uppercase",
                fontFamily: "monospace",
                fontWeight: "bolder",
                color: "white",
              }}
            >
              {authUser()?.username ?? "Username"}
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  ml: 1,
                }}
                src={avatar}
              >
              </Avatar>
            </Button>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <Box
                sx={{
                  px: 2,
                  pt: 0.5,
                  pb: 1.5,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <Typography variant="body2" fontWeight="bold" color="text.secondary">
                  Role:
                </Typography>
                <RoleChip role={role ?? "Unknown"} />
              </Box>
              <Divider />
              <MenuItem
                onClick={() => {
                  navigate("/settings")
                  handleMenuClose()
                }}
              >
                <ListItemIcon>
                  <Settings fontSize="small" />
                </ListItemIcon>
                <Typography variant="body1">Account Settings</Typography>
              </MenuItem>

              <MenuItem
                onClick={() => {
                  fullSignOut()
                  handleMenuClose()
                }}
              >
                <ListItemIcon>
                  <Logout fontSize="small" />
                </ListItemIcon>
                <Typography variant="body1">Logout</Typography>
              </MenuItem>
            </Menu>
          </Box>
        )
          : (
            <Button
              onClick={() => navigate("/login")}
              sx={{
                textTransform: "uppercase",
                fontFamily: "monospace",
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

