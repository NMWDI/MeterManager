import type { FeatureCollection, Geometry } from "geojson";
import { useQuery } from "react-query";
import { useFetchWithAuth } from "@/hooks/useFetchWithAuth";

type GuideProperties = {
  kind: "region" | "divider" | "anchor";
  id: string;
  label: string;
  coordinate_label?: string;
  label_position?: [number, number];
};
export type ChloridesReportGeometry = Omit<
  FeatureCollection<Geometry, GuideProperties>,
  "bbox"
> & {
  version: string;
  description: string;
  bbox: [number, number, number, number];
};

export const useChloridesReportGeometry = (enabled = true) => {
  const fetchWithAuth = useFetchWithAuth();
  return useQuery<ChloridesReportGeometry, Error>({
    queryKey: ["Chlorides", "Reports", "Geometry"],
    queryFn: () =>
      fetchWithAuth({ method: "GET", route: "/chlorides/report/geometry" }),
    staleTime: Infinity,
    enabled,
  });
};
