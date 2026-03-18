import { useRouterState } from "@tanstack/react-router";

type RouteLike = string | { pathname?: string };

export function useIsActiveRoute(route: RouteLike): boolean {
  const currentPath = useRouterState({
    select: (state) => state.location.pathname,
  });

  // normalize target path (strip query & hash)
  const targetPath =
    typeof route === "string"
      ? route.split("?")[0].split("#")[0]
      : route.pathname ?? "";

  return currentPath === targetPath;
}
