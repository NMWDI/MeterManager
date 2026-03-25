import { Avatar, AvatarProps, useTheme } from "@mui/material";
import { createAvatar } from "@dicebear/core";
import { notionists } from "@dicebear/collection";

export const UserAvatar = ({
  full_name,
  role,
  src,
  size = 40,
  ...avatarProps
}: {
  full_name: string;
  role?: string;
  src?: string | null;
  size?: number;
} & AvatarProps) => {
  const theme = useTheme();
  const primary = theme.palette.primary;
  const secondary = theme.palette.secondary;
  const warning = theme.palette.warning;

  const roleBgColor: Record<string, string> = {
    Admin: primary.dark,
    Technician: secondary.dark,
    OSE: warning.dark,
  };

  const roleRingColor: Record<string, string> = {
    Admin: primary.main,
    Technician: secondary.main,
    OSE: warning.main,
  };

  const fallbackSrc = src
    ? src
    : createAvatar(notionists, {
        seed: full_name,
        size: 64,
      }).toDataUri();

  return (
    <Avatar
      {...avatarProps}
      src={fallbackSrc}
      sx={{
        width: size,
        height: size,
        bgcolor: roleBgColor[role ?? ""] ?? theme.palette.grey[300],
        borderColor: roleRingColor[role ?? ""] ?? warning.main,
        borderStyle: "solid",
        borderWidth: "2px",
        boxShadow: `0 0 0 2px ${theme.palette.common.white}`,
        ...avatarProps.sx,
      }}
    />
  );
};
