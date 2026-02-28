import { useState, MouseEvent } from "react";
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
import { useNavigate } from "@tanstack/react-router";
import { useAuthUser, useSignOut } from "react-auth-kit";
import { Login, Logout, Settings } from "@mui/icons-material";
import { RoleChip, TopbarUserButton } from "./index";

export const Topbar = ({
  open,
  onMenuClick,
  sx,
}: {
  open: boolean;
  onMenuClick: () => void;
  sx?: any;
}) => {
  const navigate = useNavigate();
  const signOut = useSignOut();
  const authUser = useAuthUser();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const role: string = authUser()?.user_role?.name;
  const isLoggedIn = !!authUser();

  const handleMenuOpen = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const fullSignOut = () => {
    navigate({ to: "/" });
    localStorage.removeItem("loggedIn");
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
          {!open ? (
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
              onClick={() => navigate({ to: "/" })}
            >
              Meter Manager
            </Typography>
          ) : null}
        </Box>

        {isLoggedIn ? (
          <Box>
            <TopbarUserButton
              role={role}
              display_name={authUser()?.display_name ?? "Unknown"}
              onClick={handleMenuOpen}
              src={authUser()?.avatar_img}
            />
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              transformOrigin={{ horizontal: "right", vertical: "top" }}
              anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
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
                <Typography
                  variant="body2"
                  fontWeight="bold"
                  color="text.secondary"
                >
                  Role:
                </Typography>
                <RoleChip role={role ?? "Unknown"} />
              </Box>
              <Divider />
              <MenuItem
                onClick={() => {
                  navigate({ to: "/settings" });
                  handleMenuClose();
                }}
              >
                <ListItemIcon>
                  <Settings fontSize="small" />
                </ListItemIcon>
                <Typography variant="body1">Account Settings</Typography>
              </MenuItem>

              <MenuItem
                onClick={() => {
                  fullSignOut();
                  handleMenuClose();
                }}
              >
                <ListItemIcon>
                  <Logout fontSize="small" />
                </ListItemIcon>
                <Typography variant="body1">Logout</Typography>
              </MenuItem>
            </Menu>
          </Box>
        ) : (
          <Button
            onClick={() => navigate({ to: "/login" })}
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
                width: 36,
                height: 36,
                ml: 1,
                bgcolor: "rgb(89,90,182)",
                border: "2px solid #e0e0e0",
              }}
            >
              <Login fontSize="small" />
            </Avatar>
          </Button>
        )}
      </Toolbar>
    </AppBar>
  );
};
