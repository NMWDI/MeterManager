import { InfiniteData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from "react-query";
import { useSnackbar } from "notistack";
import { useApiClient } from "@/hooks";
import {
  Page,
  SubmitWellCreate,
  Well,
  WellDetailsQueryParams,
  WellListQueryParams,
  WellMergeParams,
  WellUpdate,
} from "@/interfaces";
import { MAP_CACHE_TTL_MS, readMapCache, writeMapCache } from "@/utils";
import { invalidateMapDataCaches } from "./mapCache";

export function useGetWellById(well_id?: number) {
  const apiClient = useApiClient();
  const route = "wells";

  return useQuery<Well, Error>(
    [route, "detail", well_id],
    () => apiClient.get(`${route}/${well_id}`),
    { enabled: !!well_id },
  );
}

export function useGetWells(params: WellListQueryParams | undefined) {
  const apiClient = useApiClient();
  const route = "wells";

  return useQuery<Page<Well>, Error>(
    [route, params],
    () => apiClient.get(route, params),
    { keepPreviousData: true },
  );
}

export function useGetWellLocations(
  searchstring: string | undefined,
  has_chloride_group: boolean | null = null,
) {
  const apiClient = useApiClient();
  const route = "well_locations";
  const PAGE_SIZE = 500;
  const queryKey = [route, searchstring, has_chloride_group] as const;
  const cachedData = readMapCache<InfiniteData<Well[]>>(queryKey);

  return useInfiniteQuery<Well[], Error>({
    queryKey,
    queryFn: async ({ pageParam = 0 }) => {
      return apiClient.get(route, {
        search_string: searchstring,
        offset: pageParam,
        limit: PAGE_SIZE,
        has_chloride_group,
      });
    },
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage || lastPage.length < PAGE_SIZE) return undefined;
      return allPages.length * PAGE_SIZE;
    },
    initialData: cachedData?.data,
    initialDataUpdatedAt: cachedData?.updatedAt,
    onSuccess: (data) => writeMapCache(queryKey, data),
    staleTime: MAP_CACHE_TTL_MS,
    cacheTime: MAP_CACHE_TTL_MS,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
}

export function useGetWell(params: WellDetailsQueryParams | undefined) {
  const apiClient = useApiClient();
  const route = "well";

  return useQuery<Well, Error>(
    [route, params],
    () => apiClient.get(route, params),
    {
      keepPreviousData: true,
      enabled: params?.well_id != undefined,
    },
  );
}

export function useCreateWell(onSuccess: Function) {
  const { enqueueSnackbar } = useSnackbar();
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const route = "wells";

  return useMutation({
    mutationFn: async (new_well: SubmitWellCreate) => {
      const response = await apiClient.post(route, new_well);

      if (!response.ok) {
        if (response.status == 422) {
          enqueueSnackbar("One or More Required Fields Not Entered!", {
            variant: "error",
          });
          throw Error("Incomplete form, check network logs for details");
        }
        if (response.status == 409) {
          enqueueSnackbar("Cannot use existing RA number", {
            variant: "error",
          });
          throw Error("RA number already in database");
        } else {
          enqueueSnackbar("Unknown Error Occurred!", { variant: "error" });
          throw Error("Unknown Error: " + response.status);
        }
      } else {
        onSuccess();
        const responseJson = await response.json();
        invalidateMapDataCaches(queryClient);
        return responseJson;
      }
    },
    retry: 0,
  });
}

export function useUpdateWell(onSuccess: Function) {
  const { enqueueSnackbar } = useSnackbar();
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const route = "wells";

  return useMutation({
    mutationFn: async (updatedWell: WellUpdate) => {
      const response = await apiClient.patch(route, updatedWell);

      if (!response.ok) {
        if (response.status == 422) {
          enqueueSnackbar("One or More Required Fields Not Entered!", {
            variant: "error",
          });
          throw Error("Incomplete form, check network logs for details");
        }
        if (response.status == 409) {
          enqueueSnackbar("Cannot use existing RA number", {
            variant: "error",
          });
          throw Error("RA number already in database");
        } else {
          enqueueSnackbar("Unknown Error Occurred!", { variant: "error" });
          throw Error("Unknown Error: " + response.status);
        }
      } else {
        onSuccess();
        const responseJson = await response.json();
        invalidateMapDataCaches(queryClient);

        const wellsQueries = queryClient.getQueryCache().findAll("wells");

        wellsQueries.forEach((query: any) => {
          queryClient.setQueryData(
            query.queryKey,
            (old: Page<Well> | undefined) => {
              if (old != undefined) {
                let newPage = JSON.parse(JSON.stringify(old));

                const wellIndex = old.items.findIndex(
                  (well: Well) => well.id == responseJson["id"],
                );
                if (wellIndex != undefined && wellIndex != -1) {
                  newPage.items[wellIndex] = responseJson;
                }
                return newPage;
              }
              return { items: [], total: 0, limit: 0, offset: 0 };
            },
          );
        });
        return responseJson;
      }
    },
    retry: 0,
  });
}

export function useMergeWells(onSuccess: Function) {
  const { enqueueSnackbar } = useSnackbar();
  const apiClient = useApiClient();
  const route = "merge_wells";

  return useMutation({
    mutationFn: async (mergeWells: WellMergeParams) => {
      console.log(mergeWells);
      const response = await apiClient.post(route, mergeWells);

      if (!response.ok) {
        if (response.status == 422) {
          enqueueSnackbar("Testing remove??!", { variant: "error" });
          throw Error("Incomplete form, check network logs for details");
        } else {
          enqueueSnackbar("Unknown Error Occurred!", { variant: "error" });
          throw Error("Unknown Error: " + response.status);
        }
      } else {
        onSuccess();
        const responseJson = await response.json();
        return responseJson;
      }
    },
    retry: 0,
  });
}
