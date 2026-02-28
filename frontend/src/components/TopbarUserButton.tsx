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
      size="small"
      color={buttonColor}
      sx={{
        ...buttonProps.sx,
        bgcolor: buttonColor,
        width: 44,
        height: 44,
        "&:hover": {
          bgcolor: buttonColor,
          opacity: 0.85,
        },
        m: undefined,
      }}
      {...buttonProps}
    >
      <Avatar
        sx={{
          width: 30,
          height: 30,
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
      size="small"
      sx={{
        ...buttonProps.sx,
        textTransform: "uppercase",
        fontFamily: "monospace",
        fontWeight: "bolder",
        color: "white",
        m: undefined,
      }}
      {...buttonProps}
    >
      {display_name ?? "Username"}
      <Avatar
        sx={{
          width: 30,
          height: 30,
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
