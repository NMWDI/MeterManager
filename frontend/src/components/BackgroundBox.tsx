import React from "react";
import { Box, BoxProps } from "@mui/material";

export const BackgroundBox: React.FC<BoxProps> = ({
  children,
  sx,
  ...rest
}) => {
  return (
    <Box
      sx={{
        mx: "auto", // center horizontally
        maxWidth: "2xl",
        height: "fit-content",
        pb: 6,
        ...sx,
      }}
      {...rest}
    >
      {children}
    </Box>
  );
};
