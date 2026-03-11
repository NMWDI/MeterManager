import { MouseEvent, useState } from "react";
import {
  AppBar,
  Box,
  Button,
  Divider,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import { Logout, Settings } from "@mui/icons-material";
import { useNavigate } from "@tanstack/react-router";
import { useAuthUser, useSignOut } from "react-auth-kit";
import { RoleChip, TopbarUserButton } from "./index";
import {
  DESKTOP_COLLAPSED_WIDTH,
  TOPBAR_HEIGHT,
} from "@/components/ui/sidebar";
import { BgColor } from "@/constants";

export const Topbar = ({
  open,
  sidebarWidth,
  onMenuClick,
  sx,
}: {
  open: boolean;
  sidebarWidth: number;
  onMenuClick: () => void;
  sx?: any;
}) => {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const navigate = useNavigate();
  const signOut = useSignOut();
  const authUser = useAuthUser();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const role: string = authUser()?.user_role?.name;
  const isLoggedIn = !!authUser();
  const effectiveSidebarWidth = isDesktop
    ? open
      ? sidebarWidth
      : DESKTOP_COLLAPSED_WIDTH
    : 0;

  const handleMenuOpen = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const fullSignOut = () => {
    navigate({ to: "/", search: {} });
    localStorage.removeItem("loggedIn");
    signOut();
  };

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        ...sx,
        width: isDesktop ? `calc(100% - ${effectiveSidebarWidth}px)` : "100%",
        ml: isDesktop ? `${effectiveSidebarWidth}px` : 0,
        backgroundColor: BgColor,
        borderBottom: "1px solid",
        borderColor: "divider",
        backdropFilter: "blur(14px)",
        boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
        transition: "width 180ms ease, margin-left 180ms ease",
      }}
    >
      <Toolbar
        sx={{
          justifyContent: "space-between",
          minHeight: TOPBAR_HEIGHT,
          px: { xs: 1.25, sm: 2 },
          py: { xs: 0.75, sm: 1 },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", minWidth: 0 }}>
          {!isDesktop ? (
            <IconButton
              edge="start"
              color="inherit"
              onClick={onMenuClick}
              sx={{
                mr: 1,
                ml: 0.5,
                color: "darkblue",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 3,
                width: 44,
                height: 44,
              }}
            >
              {open ? <CloseIcon /> : <MenuIcon />}
            </IconButton>
          ) : null}

          <Box
            sx={{
              ml: isDesktop ? 0 : 0.5,
              minWidth: 0,
            }}
          >
            <Typography
              variant="h6"
              noWrap
              sx={{
                color: "darkblue",
                cursor: "pointer",
                fontWeight: 800,
                lineHeight: 1.1,
                fontSize: { xs: "1.1rem", sm: "1.2rem", md: "1.3rem" },
              }}
              onClick={() => navigate({ to: "/", search: {} })}
            >
              Meter Manager
            </Typography>
          </Box>
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
                  navigate({ to: "/settings", search: {} });
                  handleMenuClose();
                }}
              >
                <ListItemIcon>
                  <Settings fontSize="small" />
                </ListItemIcon>
                <Typography variant="body1">Settings</Typography>
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
            size="small"
            onClick={() => navigate({ to: "/login", search: {} })}
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
          </Button>
        )}
      </Toolbar>
    </AppBar>
  );
};
