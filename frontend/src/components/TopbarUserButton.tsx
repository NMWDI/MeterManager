import { ButtonProps, IconButton } from "@mui/material";
import { getRoleColor } from "@/utils";
import { UserAvatar } from "@/components/UserAvatar";

export const TopbarUserButton = ({
  full_name,
  role,
  src,
  ...buttonProps
}: {
  full_name: string;
  role: string;
  src?: string;
} & ButtonProps) => {
  const buttonColor = getRoleColor(role);

  return (
    <IconButton
      size="small"
      color={buttonColor}
      sx={{
        ...buttonProps.sx,
        width: { xs: 35, md: 40, lg: 44 },
        height: { xs: 35, md: 40, lg: 44 },
        bgcolor: buttonColor,
        "&:hover": {
          bgcolor: buttonColor,
          opacity: 0.85,
        },
        m: undefined,
      }}
      {...buttonProps}
    >
      <UserAvatar
        full_name={full_name}
        role={role}
        src={src}
        sx={{
          width: { xs: 35, md: 40 },
          height: { xs: 35, md: 40 },
        }}
      />
    </IconButton>
  );
};
