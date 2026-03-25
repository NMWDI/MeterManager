import { QueryClient } from "react-query";
import { clearSavedQueryLocalStorage } from "@/utils";

const MAP_QUERY_ROUTES = ["meters_locations", "well_locations"] as const;

export function invalidateMapDataCaches(queryClient: QueryClient) {
  clearSavedQueryLocalStorage();
  MAP_QUERY_ROUTES.forEach((route) => {
    queryClient.removeQueries(route);
    queryClient.invalidateQueries(route);
  });
}
