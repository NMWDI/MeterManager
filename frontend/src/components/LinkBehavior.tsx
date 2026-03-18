import { Link as RouterLink, createLink } from "@tanstack/react-router";
import { Link as MuiLink, type LinkProps as MuiLinkProps } from "@mui/material";
import { forwardRef } from "react";

// MUI expects the component to forwardRef to an <a> element
export const LinkBehavior = forwardRef<
  HTMLAnchorElement,
  React.ComponentProps<typeof RouterLink>
>(function LinkBehavior(props, ref) {
  return <RouterLink ref={ref} {...props} />;
});

const MUILinkComponent = forwardRef<HTMLAnchorElement, MuiLinkProps>(
  (props, ref) => <MuiLink ref={ref} {...props} />,
);

export const RouterMuiLink = createLink(MUILinkComponent);
