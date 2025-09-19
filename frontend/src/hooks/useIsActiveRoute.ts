import { useLocation } from "react-router-dom";

type RouteLike = string | { pathname?: string };

export function useIsActiveRoute(route: RouteLike): boolean {
  const location = useLocation();
  const currentPath = location.pathname;

  // normalize target path (strip query & hash)
  const targetPath =
    typeof route === "string"
      ? route.split("?")[0].split("#")[0]
      : route.pathname ?? "";

  return currentPath === targetPath;
}
