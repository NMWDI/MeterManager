import React from "react";
import { Box, BoxProps } from "@mui/material";

export const ModalBackgroundBox: React.FC<BoxProps> = ({
  children,
  sx,
  ...rest
}) => {
  return (
    <Box
      sx={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        bgcolor: "background.paper",   // MUI theme-aware background
        boxShadow: 24,                 // MUI’s shadow scale (number, not string)
        borderRadius: 2,               // uses theme.spacing(2) = 16px
        p: 4,                          // shorthand padding (theme.spacing(4) = 32px)
        width: "90%",                  // responsive width
        maxWidth: 600,                 // cap width for large screens
        maxHeight: "90vh",             // keep it from overflowing viewport
        overflowY: "auto",             // scroll if content is tall
        display: "flex",
        flexDirection: "column",
        ...sx,
      }}
      {...rest}
    >
      {children}
    </Box>
  );
};
