import {
  Avatar,
  Button,
  ButtonProps,
  useTheme,
  useMediaQuery,
  IconButton,
} from "@mui/material";
import { Badge, Engineering, Face } from "@mui/icons-material";
import { getRoleColor } from "@/utils";

export const TopbarUserButton = ({
  display_name,
  role,
  src,
  ...buttonProps
}: {
  display_name: string;
  role: string;
  src?: string;
} & ButtonProps) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const buttonColor = getRoleColor(role);

  const primary = theme.palette.primary;
  const secondary = theme.palette.secondary;
  const warning = theme.palette.warning;

  const roleIcons: Record<string, JSX.Element> = {
    Admin: <Badge fontSize="small" sx={{ color: primary.contrastText }} />,
    Technician: (
      <Engineering fontSize="small" sx={{ color: secondary.contrastText }} />
    ),
  };

  const renderRoleIcon = () =>
    roleIcons[role] ?? <Face fontSize="small" sx={{ color: warning.main }} />;

  const roleBgColor: Record<string, string> = {
    Admin: primary.dark,
    Technician: secondary.dark,
    OSE: warning.dark,
  };

  const roleBorderColor: Record<string, string> = {
    Admin: primary.contrastText,
    Technician: secondary.contrastText,
    OSE: warning.contrastText,
  };

  return isSmallScreen ? (
    <IconButton
      color={buttonColor}
      sx={{
        bgcolor: buttonColor,
        width: 44,
        height: 44,
        "&:hover": {
          bgcolor: buttonColor,
          opacity: 0.85,
        },
        ...buttonProps.sx,
      }}
      {...buttonProps}
    >
      <Avatar
        sx={{
          width: 36,
          height: 36,
          bgcolor: roleBgColor[role],
          borderColor: roleBorderColor[role],
          borderStyle: "solid",
          borderWidth: "2px",
        }}
        src={src}
      >
        {src ? null : renderRoleIcon()}
      </Avatar>
    </IconButton>
  ) : (
    <Button
      color={buttonColor}
      variant="contained"
      sx={{
        textTransform: "uppercase",
        fontFamily: "monospace",
        fontWeight: "bolder",
        color: "white",
        ...buttonProps.sx,
      }}
      {...buttonProps}
    >
      {display_name ?? "Username"}
      <Avatar
        sx={{
          width: 36,
          height: 36,
          ml: 1,
          bgcolor: roleBgColor[role],
          borderColor: roleBorderColor[role],
          borderStyle: "solid",
          borderWidth: "2px",
        }}
        src={src}
      >
        {src ? null : renderRoleIcon()}
      </Avatar>
    </Button>
  );
};
