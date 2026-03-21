import { useQuery } from "react-query";
import { useFetchST2 } from "@/hooks";
import { ST2Measurement } from "@/interfaces";

export function useGetST2WaterLevels(datastreamID: number | undefined) {
  const route = `Datastreams(${datastreamID})/Observations`;
  const fetchST2 = useFetchST2();

  return useQuery<ST2Measurement[], Error>(
    [route, datastreamID],
    () => fetchST2("GET", `/${route}`),
    { enabled: !!datastreamID },
  );
}
