import { Avatar, Button, ButtonProps } from "@mui/material";
import { getRoleColor } from "../utils";
import { Badge, Engineering, Face } from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";


export const TopbarUserButton = ({
  display_name,
  role,
  src,
  ...buttonProps
}: {
  display_name: string,
  role: string,
  src?: string
} & ButtonProps) => {
  const theme = useTheme();
  const buttonColor = getRoleColor(role);

  const primary = theme.palette.primary;
  const secondary = theme.palette.secondary;
  const warning = theme.palette.warning;

  const roleIcons: Record<string, JSX.Element> = {
    Admin: <Badge fontSize="small" sx={{ color: primary.contrastText }} />,
    Technician: <Engineering fontSize="small" sx={{ color: secondary.contrastText }} />,
  };

  const renderRoleIcon = () => roleIcons[role] ?? <Face fontSize="small" sx={{ color: warning.main }} />;

  const roleBgColor: Record<string, string> = {
    Admin: primary.dark,
    Technician: secondary.dark,
    OSE: warning.dark
  }

  const roleBorderColor: Record<string, string> = {
    Admin: primary.contrastText,
    Technician: secondary.contrastText,
    OSE: warning.contrastText
  }

  return (
    <Button
      color={buttonColor}
      variant="contained"
      sx={{
        textTransform: "uppercase",
        fontFamily: "monospace",
        fontWeight: "bolder",
        color: "white",
        ...buttonProps.sx, // allow overriding sx
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
          borderStyle: 'solid',
          borderWidth: "2px",
        }}
        src={src}
      >
        {src ? null : renderRoleIcon()}
      </Avatar>
    </Button>
  );
}
