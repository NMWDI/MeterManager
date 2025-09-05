import { Chip } from "@mui/material";

export const RoleChip = ({ role }: { role: string }) => {
  switch (role) {
    case "Admin": {
      return <Chip sx={{ fontFamily: "monospace" }} size="small" label="Admin" color="primary" />;
    }
    case "Technician": {
      return <Chip sx={{ fontFamily: "monospace" }} size="small" label="Technician" color="secondary" />;
    }
    default: {
      return <Chip sx={{ fontFamily: "monospace" }} size="small" label={role} color="warning" />;
    }
  }
}
