import { ButtonProps } from "@mui/material";

export const getRoleColor = (role?: string): ButtonProps['color'] => {
  switch (role) {
    case "Admin":
      return "primary";
    case "Technician":
      return "secondary";
    default:
      return "warning";
  }
};
