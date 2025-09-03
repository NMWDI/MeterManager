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
        mx: "auto",             // center horizontally
        maxWidth: "xl",         // limit to MUI's `xl` breakpoint (default is 1536px)
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
