import {
  createRootRoute,
  ErrorComponentProps,
  Outlet,
} from "@tanstack/react-router";
import { AppLayout } from "@/AppLayout";
import { NotFound, RouteErrorView } from "@/views";

const RootErrorComponent = ({ error, reset }: ErrorComponentProps) => {
  return <RouteErrorView error={error} onRetry={reset} />;
};

export const Route = createRootRoute({
  component: () => (
    <AppLayout>
      <Outlet />
    </AppLayout>
  ),
  errorComponent: RootErrorComponent,
  notFoundComponent: NotFound,
});
