import { useSnackbar } from "notistack";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { useApiClient } from "@/hooks";
import {
  Meter,
  MeterDetails,
  MeterDetailsQueryParams,
  MeterHistoryDTO,
  MeterListDTO,
  MeterListQueryParams,
  MeterMapDTO,
  MeterPartParams,
  Page,
  Part,
} from "@/interfaces";
import { MAP_CACHE_TTL_MS, readMapCache, writeMapCache } from "@/utils";
import { invalidateMapDataCaches } from "./mapCache";

export function useGetMeterList(params: MeterListQueryParams | undefined) {
  const apiClient = useApiClient();
  const route = "meters";

  return useQuery<Page<MeterListDTO>, Error>([route, params], () =>
    apiClient.get(route, params),
  );
}

export function useGetMeterLocations(searchstring: string | undefined) {
  const apiClient = useApiClient();
  const route = "meters_locations";
  const queryKey = [route, searchstring] as const;
  const cachedData = readMapCache<MeterMapDTO[]>(queryKey);

  return useQuery<MeterMapDTO[], Error>({
    queryKey,
    queryFn: () =>
      apiClient.get(route, {
        search_string: searchstring,
      }),
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

export function useGetMeterHistory(params: MeterDetailsQueryParams) {
  const apiClient = useApiClient();
  const route = "meter_history";

  return useQuery<MeterHistoryDTO[], Error>(
    [route, params],
    () => apiClient.get(route, params),
    { enabled: params?.meter_id != undefined },
  );
}

export function useGetMeter(params: MeterDetailsQueryParams | undefined) {
  const apiClient = useApiClient();
  const route = "meter";

  return useQuery<MeterDetails, Error>(
    [route, params],
    () => apiClient.get(route, params),
    {
      keepPreviousData: true,
      enabled: params?.meter_id != undefined,
    },
  );
}

export function useGetMeterPartsList(params: MeterPartParams | undefined) {
  const apiClient = useApiClient();
  const route = "meter_parts";

  return useQuery<Part[], Error>(
    [route, params],
    () => apiClient.get(route, params),
    {
      enabled: params?.meter_id != undefined,
    },
  );
}

export function useCreateMeter(onSuccess: Function) {
  const { enqueueSnackbar } = useSnackbar();
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const route = "meters";

  return useMutation({
    mutationFn: async (meter: Meter) => {
      const response = await apiClient.post(route, meter);

      if (!response.ok) {
        if (response.status == 422) {
          enqueueSnackbar("One or More Required Fields Not Entered!", {
            variant: "error",
          });
          throw Error("Incomplete form, check network logs for details");
        }
        if (response.status == 409) {
          enqueueSnackbar("Cannot use existing serial number!", {
            variant: "error",
          });
          throw Error("Meter serial number already in database");
        } else {
          enqueueSnackbar("Unknown Error Occurred!", { variant: "error" });
          throw Error("Unknown Error: " + response.status);
        }
      }

      return response.json();
    },
    onSuccess: (responseJson) => {
      onSuccess();

      invalidateMapDataCaches(queryClient);

      queryClient.invalidateQueries({
        queryKey: [route],
      });

      return responseJson;
    },
    retry: 0,
  });
}

export function useUpdateMeter(onSuccess: Function) {
  const { enqueueSnackbar } = useSnackbar();
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const route = "meter";

  return useMutation({
    mutationFn: async (meterDetails: Meter) => {
      const response = await apiClient.patch(route, meterDetails);

      if (!response.ok) {
        if (response.status == 422) {
          enqueueSnackbar("One or More Required Fields Not Entered!", {
            variant: "error",
          });
          throw Error("Incomplete form, check network logs for details");
        }
        if (response.status == 409) {
          enqueueSnackbar("Cannot use existing serial number!", {
            variant: "error",
          });
          throw Error("Meter serial number already in database");
        } else {
          enqueueSnackbar("Unknown Error Occurred!", { variant: "error" });
          throw Error("Unknown Error: " + response.status);
        }
      } else {
        onSuccess();

        const responseJson = await response.json();
        invalidateMapDataCaches(queryClient);

        const meterQueries = queryClient.getQueryCache().findAll("meters");

        meterQueries.forEach((query: any) => {
          queryClient.setQueryData(
            query.queryKey,
            (old: Page<Meter> | undefined) => {
              if (old != undefined) {
                let newPage = JSON.parse(JSON.stringify(old));

                const meterIndex = old.items.findIndex(
                  (meter: Meter) => meter.id == responseJson["id"],
                );
                if (meterIndex != undefined && meterIndex != -1) {
                  newPage.items[meterIndex] = responseJson;
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
