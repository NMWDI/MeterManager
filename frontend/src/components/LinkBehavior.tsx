import { Link as RouterLink } from "@tanstack/react-router";
import { forwardRef } from "react";

// MUI expects the component to forwardRef to an <a> element
export const LinkBehavior = forwardRef<
  HTMLAnchorElement,
  React.ComponentProps<typeof RouterLink>
>(function LinkBehavior(props, ref) {
  return <RouterLink ref={ref} {...props} />;
});
