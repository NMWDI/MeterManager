import { createLink } from "@tanstack/react-router";
import { IconButton, type ButtonProps } from "@mui/material";
import { forwardRef } from "react";

export const TanstackIconButton = createLink(
  forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
    return <IconButton ref={ref} component="button" {...props} />;
  }),
);
