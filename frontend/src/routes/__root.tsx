import { createRootRoute, Outlet } from "@tanstack/react-router";
import { AppLayout } from "@/AppLayout";
import { NotFound } from "@/views";

export const Route = createRootRoute({
  component: () => (
    <AppLayout>
      <Outlet />
    </AppLayout>
  ),
  notFoundComponent: NotFound,
});
