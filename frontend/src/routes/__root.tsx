import {
  createRootRouteWithContext,
  ErrorComponentProps,
  Outlet,
} from "@tanstack/react-router";
import type { QueryClient } from "react-query";
import { AppLayout } from "@/AppLayout";
import { NotFound, RouteErrorView } from "@/views";

const RootErrorComponent = ({ error, reset }: ErrorComponentProps) => {
  return <RouteErrorView error={error} onRetry={reset} />;
};

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
  {
    component: () => (
      <AppLayout>
        <Outlet />
      </AppLayout>
    ),
    errorComponent: RootErrorComponent,
    notFoundComponent: NotFound,
  },
);
