import {
  InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  UseQueryOptions,
} from "react-query";
import { useAuthHeader, useSignOut } from "react-auth-kit";
import { enqueueSnackbar, useSnackbar } from "notistack";
import {
  ActivityTypeLU,
  HomeSummary,
  MeterListDTO,
  MeterListQueryParams,
  MeterTypeLU,
  NewWellMeasurement,
  NoteTypeLU,
  ObservedPropertyTypeLU,
  Page,
  ST2Measurement,
  ST2Response,
  ServiceTypeLU,
  User,
  WaterLevelQueryParams,
  WellMergeParams,
  WellMeasurementDTO,
  Well,
  WellListQueryParams,
  WellDetailsQueryParams,
  MeterDetailsQueryParams,
  MeterDetails,
  MeterPartParams,
  MeterMapDTO,
  MeterHistoryDTO,
  Part,
  PartTypeLU,
  UserRole,
  SecurityScope,
  UpdatedUserPassword,
  WellUseLU,
  SubmitWellCreate,
  WellUpdate,
  Meter,
  MeterStatus,
  PatchObservationSubmit,
  PatchActivitySubmit,
  PatchWellMeasurement,
  WorkOrder,
  PatchWorkOrder,
  NewWorkOrder,
  MeterRegister,
  WaterSource,
  WellStatus,
} from "@/interfaces";
import { IncreaseQuantityPayload } from "@/interfaces";
import { WorkOrderStatus } from "@/enums";
import { API_URL } from "@/config";
import { useNavigate } from "@tanstack/react-router";
import {
  PartHistoryResponse,
  UpdatePartHistoryPayload,
} from "@/interfaces/PartHistoryResponse";

// Cashe for up to 48 hours
const MAP_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 2;
const MAP_CACHE_PREFIX = "wmdb:map-cache:";
const MAP_QUERY_ROUTES = ["meters_locations", "well_locations"] as const;

type StoredMapCache<T> = {
  data: T;
  updatedAt: number;
};

function getMapCacheStorageKey(queryKey: readonly unknown[]) {
  return `${MAP_CACHE_PREFIX}${JSON.stringify(queryKey)}`;
}

function readMapCache<T>(queryKey: readonly unknown[]) {
  if (typeof window === "undefined") return undefined;

  const storageKey = getMapCacheStorageKey(queryKey);
  const rawValue = window.localStorage.getItem(storageKey);
  if (!rawValue) return undefined;

  try {
    const parsed = JSON.parse(rawValue) as StoredMapCache<T>;
    if (
      !parsed ||
      typeof parsed.updatedAt !== "number" ||
      Date.now() - parsed.updatedAt > MAP_CACHE_TTL_MS
    ) {
      window.localStorage.removeItem(storageKey);
      return undefined;
    }

    return parsed;
  } catch {
    window.localStorage.removeItem(storageKey);
    return undefined;
  }
}

function writeMapCache<T>(queryKey: readonly unknown[], data: T) {
  if (typeof window === "undefined") return;

  const storageKey = getMapCacheStorageKey(queryKey);
  const value: StoredMapCache<T> = {
    data,
    updatedAt: Date.now(),
  };

  window.localStorage.setItem(storageKey, JSON.stringify(value));
}

export function clearSavedQueryLocalStorage() {
  if (typeof window === "undefined") return;

  const keysToRemove: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key?.startsWith(MAP_CACHE_PREFIX)) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => window.localStorage.removeItem(key));
}

function invalidateMapDataCaches(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  clearSavedQueryLocalStorage();
  MAP_QUERY_ROUTES.forEach((route) => {
    queryClient.removeQueries(route);
    queryClient.invalidateQueries(route);
  });
}

// Date display util
export function toGMT6String(date: Date) {
  const dateString =
    date.getMonth() +
    1 +
    "/" +
    (date.getDate() + 1) +
    "/" +
    date.getFullYear() +
    " ";

  date.setHours(date.getHours() - 5);
  const timeString = date.toLocaleTimeString("en-US", {
    timeZone: "America/Denver",
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  });

  return dateString + timeString;
}

// Generate a query param string with empty and null fields removed
function formattedQueryParams(queryParams: any) {
  if (!queryParams) return "";

  let queryParamString = new URLSearchParams();
  let params = { ...queryParams };

  for (let param in params) {
    if (params[param] === "" || params[param] == undefined) {
      continue;
    }
    //Handle situation where we have an array of values
    if (Array.isArray(params[param])) {
      for (let value of params[param]) {
        queryParamString.append(param, value);
      }
    } else {
      queryParamString.append(param, params[param]);
    }
  }
  // Convert the URLSearchParams object to a string
  let formattedString = "?" + queryParamString.toString();

  return formattedString;
}

// Fetch function that handles incoming errors from the response. Used as the queryFn in useQuery hooks
async function GETFetch(
  route: string,
  params: any,
  authHeader: string,
  signOut: Function,
  navigate: Function,
) {
  const headers = { Authorization: authHeader };
  const response = await fetch(
    `${API_URL}/${route}` + formattedQueryParams(params),
    {
      headers: headers,
    },
  );

  if (!response.ok) {
    // If backend indicates that user's token is expired, log them out and notify
    if (response.status == 440 && localStorage.getItem("loggedIn")) {
      localStorage.removeItem("loggedIn");
      navigate({ to: "/" });
      signOut();
      enqueueSnackbar("Your session has expired, please login again.", {
        variant: "error",
      });
    }
    throw new Error(response.status.toString());
  }

  return response.json();
}

// Fetches from the NM API's ST2 subdomain (data that relates to water levels)
// For PVACD data, measurements are every 2 hours giving 12 measurements per day and ~4000 per year
// If I want the last 5 years of data, that's 20,000 measurements and I will need to loop through the @iot.nextLink
// to get all the data
async function GETST2Fetch(route: string) {
  const starting_year = new Date().getFullYear() - 5;

  const queryParams = formattedQueryParams({
    $filter: `year(phenomenonTime) gt ${starting_year}`,
    $orderby: "phenomenonTime asc",
  });

  const url = `https://st2.newmexicowaterdata.org/FROST-Server/v1.1/`;

  // The ST2 API returns data in chunks of 1000, get each chunk and return them all
  let valueList: ST2Measurement[] = [];
  let nextLink = url + route + queryParams;
  let count = 0; // Ensure that it doesn't get stuck in an infinite loop, if somehow iot.nextLink is always defined
  do {
    const results: ST2Response = await fetch(nextLink).then((r) => r.json());
    nextLink = results["@iot.nextLink"];
    valueList.push(...results.value);
    count++;
  } while (nextLink && count < 20);

  return valueList;
}

async function POSTFetch(route: string, object: any, authHeader: string) {
  const headers = {
    Authorization: authHeader,
    "Content-type": "application/json",
  };

  return fetch(`${API_URL}/${route}`, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(object),
  });
}

async function PATCHFetch(route: string, object: any, authHeader: string) {
  const headers = {
    Authorization: authHeader,
    "Content-type": "application/json",
  };

  return fetch(`${API_URL}/${route}`, {
    method: "PATCH",
    headers: headers,
    body: JSON.stringify(object),
  });
}

export function useGetUseTypes() {
  const route = "use_types";
  const authHeader = useAuthHeader();
  const navigate = useNavigate();
  const signOut = useSignOut();

  return useQuery<WellUseLU[], Error>(
    [route],
    () => GETFetch(route, null, authHeader(), signOut, navigate),
    { keepPreviousData: true },
  );
}

export function useGetWaterSources() {
  const route = "water_sources";
  const authHeader = useAuthHeader();
  const navigate = useNavigate();
  const signOut = useSignOut();

  return useQuery<WaterSource[], Error>(
    [route],
    () => GETFetch(route, null, authHeader(), signOut, navigate),
    { keepPreviousData: true },
  );
}

export function useGetWellStatusTypes() {
  const route = "well_status_types";
  const authHeader = useAuthHeader();
  const navigate = useNavigate();
  const signOut = useSignOut();

  return useQuery<WellStatus[], Error>(
    [route],
    () => GETFetch(route, null, authHeader(), signOut, navigate),
    { keepPreviousData: true },
  );
}

export function useGetMeterList(params: MeterListQueryParams | undefined) {
  const route = "meters";
  const authHeader = useAuthHeader();
  const navigate = useNavigate();
  const signOut = useSignOut();

  return useQuery<Page<MeterListDTO>, Error>([route, params], () =>
    GETFetch(route, params, authHeader(), signOut, navigate),
  );
}

export function useGetMeterLocations(searchstring: string | undefined) {
  const route = "meters_locations";
  const authHeader = useAuthHeader();
  const navigate = useNavigate();
  const signOut = useSignOut();
  const queryKey = [route, searchstring] as const;
  const cachedData = readMapCache<MeterMapDTO[]>(queryKey);

  return useQuery<MeterMapDTO[], Error>({
    queryKey,
    queryFn: () =>
      GETFetch(
        route,
        { search_string: searchstring },
        authHeader(),
        signOut,
        navigate,
      ),
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

export function useGetMeterTypeList() {
  const route = "meter_types";
  const authHeader = useAuthHeader();
  const navigate = useNavigate();
  const signOut = useSignOut();

  return useQuery<MeterTypeLU[], Error>([route], () =>
    GETFetch(route, null, authHeader(), signOut, navigate),
  );
}

export function useGetHomeSummary() {
  const route = "maintenance/home_summary";
  const authHeader = useAuthHeader();
  const navigate = useNavigate();
  const signOut = useSignOut();

  return useQuery<HomeSummary, Error>([route], () =>
    GETFetch(route, null, authHeader(), signOut, navigate),
  );
}

export function useGetMeterRegisterList() {
  const route = "meter_registers";
  const authHeader = useAuthHeader();
  const navigate = useNavigate();
  const signOut = useSignOut();

  return useQuery<MeterRegister[], Error>([route], () =>
    GETFetch(route, null, authHeader(), signOut, navigate),
  );
}

export function useGetMeterStatusTypeList() {
  const route = "meter_status_types";
  const authHeader = useAuthHeader();
  const navigate = useNavigate();
  const signOut = useSignOut();

  return useQuery<MeterStatus[], Error>([route], () =>
    GETFetch(route, null, authHeader(), signOut, navigate),
  );
}

export function useGetNoteTypes() {
  const route = "note_types";
  const authHeader = useAuthHeader();
  const navigate = useNavigate();
  const signOut = useSignOut();

  return useQuery<NoteTypeLU[], Error>([route], () =>
    GETFetch(route, null, authHeader(), signOut, navigate),
  );
}

export function useGetMeterHistory(params: MeterDetailsQueryParams) {
  const route = "meter_history";
  const authHeader = useAuthHeader();
  const navigate = useNavigate();
  const signOut = useSignOut();

  return useQuery<MeterHistoryDTO[], Error>(
    [route, params],
    () => GETFetch(route, params, authHeader(), signOut, navigate),
    { enabled: params?.meter_id != undefined },
  );
}

export function useGetSecurityScopes() {
  const route = "security_scopes";
  const authHeader = useAuthHeader();
  const navigate = useNavigate();
  const signOut = useSignOut();

  return useQuery<SecurityScope[], Error>([route], () =>
    GETFetch(route, null, authHeader(), signOut, navigate),
  );
}

export function useGetRoles() {
  const route = "roles";
  const authHeader = useAuthHeader();
  const navigate = useNavigate();
  const signOut = useSignOut();

  return useQuery<UserRole[], Error>([route], () =>
    GETFetch(route, null, authHeader(), signOut, navigate),
  );
}

export function useGetUserAdminList() {
  const route = "usersadmin";
  const authHeader = useAuthHeader();
  const navigate = useNavigate();
  const signOut = useSignOut();

  return useQuery<User[], Error>([route], () =>
    GETFetch(route, null, authHeader(), signOut, navigate),
  );
}

export function useGetUserList() {
  const route = "users";
  const authHeader = useAuthHeader();
  const navigate = useNavigate();
  const signOut = useSignOut();

  return useQuery<User[], Error>([route], () =>
    GETFetch(route, null, authHeader(), signOut, navigate),
  );
}

export function useGetUser(id: number, options = {}) {
  const route = "users";
  const authHeader = useAuthHeader();
  const navigate = useNavigate();
  const signOut = useSignOut();

  return useQuery<User, Error>(
    [route, id],
    () => GETFetch(`${route}/${id}`, null, authHeader(), signOut, navigate),
    options,
  );
}

export function useGetActivityTypeList() {
  const route = "activity_types";
  const authHeader = useAuthHeader();
  const navigate = useNavigate();
  const signOut = useSignOut();

  return useQuery<ActivityTypeLU[], Error>([route, null], () =>
    GETFetch(route, null, authHeader(), signOut, navigate),
  );
}

export function useGetServiceTypes() {
  const route = "service_types";
  const authHeader = useAuthHeader();
  const navigate = useNavigate();
  const signOut = useSignOut();

  return useQuery<ServiceTypeLU[], Error>([route, null], () =>
    GETFetch(route, null, authHeader(), signOut, navigate),
  );
}

export function useGetWaterLevels(params: WaterLevelQueryParams) {
  const route = "waterlevels";
  const authHeader = useAuthHeader();
  const navigate = useNavigate();
  const signOut = useSignOut();

  return useQuery<WellMeasurementDTO[], Error>([route, params], () =>
    GETFetch(route, params, authHeader(), signOut, navigate),
  );
}

export function useGetChloridesLevels(params: WaterLevelQueryParams) {
  const route = "chlorides";
  const authHeader = useAuthHeader();
  const navigate = useNavigate();
  const signOut = useSignOut();

  return useQuery<WellMeasurementDTO[], Error>([route, params], () =>
    GETFetch(route, params, authHeader(), signOut, navigate),
  );
}

export function useGetPropertyTypes() {
  const route = "observed_property_types";
  const authHeader = useAuthHeader();
  const navigate = useNavigate();
  const signOut = useSignOut();

  return useQuery<ObservedPropertyTypeLU[], Error>([route], () =>
    GETFetch(route, null, authHeader(), signOut, navigate),
  );
}

export function useGetWellById(well_id?: number) {
  const route = "wells";
  const authHeader = useAuthHeader();
  const navigate = useNavigate();
  const signOut = useSignOut();

  return useQuery<Well, Error>(
    [route, "detail", well_id],
    () =>
      GETFetch(
        `${route}/${well_id}`,
        undefined,
        authHeader(),
        signOut,
        navigate,
      ),
    { enabled: !!well_id },
  );
}

export function useGetWells(params: WellListQueryParams | undefined) {
  const route = "wells";
  const authHeader = useAuthHeader();
  const navigate = useNavigate();
  const signOut = useSignOut();

  return useQuery<Page<Well>, Error>(
    [route, params],
    () => GETFetch(route, params, authHeader(), signOut, navigate),
    { keepPreviousData: true },
  );
}

export function useGetWellLocations(
  searchstring: string | undefined,
  has_chloride_group: boolean | null = null,
) {
  const route = "well_locations";
  const authHeader = useAuthHeader();
  const navigate = useNavigate();
  const signOut = useSignOut();
  const PAGE_SIZE = 500;
  const queryKey = [route, searchstring, has_chloride_group] as const;
  const cachedData = readMapCache<InfiniteData<Well[]>>(queryKey);

  return useInfiniteQuery<Well[], Error>({
    queryKey,
    queryFn: async ({ pageParam = 0 }) => {
      return GETFetch(
        route,
        {
          search_string: searchstring,
          offset: pageParam,
          limit: PAGE_SIZE,
          has_chloride_group,
        },
        authHeader(),
        signOut,
        navigate,
      );
    },
    getNextPageParam: (lastPage, allPages) => {
      // If we got less than PAGE_SIZE, we’re done
      if (!lastPage || lastPage.length < PAGE_SIZE) return undefined;
      return allPages.length * PAGE_SIZE; // next offset
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
  const route = "well";
  const authHeader = useAuthHeader();
  const navigate = useNavigate();
  const signOut = useSignOut();

  return useQuery<Well, Error>(
    [route, params],
    () => GETFetch(route, params, authHeader(), signOut, navigate),
    {
      keepPreviousData: true,
      enabled: params?.well_id != undefined,
    },
  );
}

export function useGetMeter(params: MeterDetailsQueryParams | undefined) {
  const route = "meter";
  const authHeader = useAuthHeader();
  const navigate = useNavigate();
  const signOut = useSignOut();

  return useQuery<MeterDetails, Error>(
    [route, params],
    () => GETFetch(route, params, authHeader(), signOut, navigate),
    {
      keepPreviousData: true,
      enabled: params?.meter_id != undefined,
    },
  );
}

export function useGetPartTypeList() {
  const route = "part_types";
  const authHeader = useAuthHeader();
  const navigate = useNavigate();
  const signOut = useSignOut();

  return useQuery<PartTypeLU[], Error>(
    [route],
    () => GETFetch(route, null, authHeader(), signOut, navigate),
    {
      keepPreviousData: true,
    },
  );
}

export function useGetParts() {
  const route = "parts";
  const authHeader = useAuthHeader();
  const navigate = useNavigate();
  const signOut = useSignOut();

  return useQuery<Part[], Error>(
    [route],
    () => GETFetch(route, null, authHeader(), signOut, navigate),
    {
      keepPreviousData: true,
    },
  );
}

export function useGetPart(params: { part_id: number } | undefined) {
  const route = "part";
  const authHeader = useAuthHeader();
  const navigate = useNavigate();
  const signOut = useSignOut();

  return useQuery<Part, Error>(
    [route, params],
    () => GETFetch(route, params, authHeader(), signOut, navigate),
    {
      keepPreviousData: true,
      enabled: params?.part_id != undefined,
    },
  );
}

export function useGetMeterPartsList(params: MeterPartParams | undefined) {
  const route = "meter_parts";
  const authHeader = useAuthHeader();
  const navigate = useNavigate();
  const signOut = useSignOut();

  return useQuery<Part[], Error>(
    [route, params],
    () => GETFetch(route, params, authHeader(), signOut, navigate),
    {
      enabled: params?.meter_id != undefined,
    },
  );
}

export function useGetST2WaterLevels(datastreamID: number | undefined) {
  const route = `Datastreams(${datastreamID})/Observations`;

  return useQuery<ST2Measurement[], Error>(
    [route, datastreamID],
    () => GETST2Fetch(route),
    { enabled: !!datastreamID },
  );
}

export function useGetWorkOrders(
  params: {
    filter_by_status: WorkOrderStatus[];
    start_date?: string; // ISO date string (YYYY-MM-DD)
    work_order_id?: number[];
    assigned_user_id?: number;
    q?: string;
  },
  options?: UseQueryOptions<WorkOrder[], Error>,
) {
  const route = "work_orders";
  const authHeader = useAuthHeader();
  const navigate = useNavigate();
  const signOut = useSignOut();

  // normalize params so queryKey is stable (order of arrays matters)
  const normalized = {
    ...params,
    filter_by_status: [...(params.filter_by_status ?? [])].sort(),
    work_order_id: params.work_order_id
      ? [...params.work_order_id].sort((a, b) => a - b)
      : undefined,
    q: params.q?.trim() || undefined,
  };

  return useQuery<WorkOrder[], Error>({
    queryKey: [route, normalized],
    queryFn: () => GETFetch(route, normalized, authHeader(), signOut, navigate),
    ...options,
  });
}

export function useCreateUser(onSuccess: Function) {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const route = "users";
  const authHeader = useAuthHeader();

  return useMutation({
    mutationFn: async (user: User) => {
      const response = await POSTFetch(route, user, authHeader());

      if (!response.ok) {
        if (response.status == 422) {
          enqueueSnackbar("One or More Required Fields Not Entered!", {
            variant: "error",
          });
          throw Error("Incomplete form, check network logs for details");
        } else {
          enqueueSnackbar("Unknown Error Occurred!", { variant: "error" });
          throw Error("Unknown Error: " + response.status);
        }
      } else {
        onSuccess();

        const responseJson = await response.json();
        queryClient.setQueryData(["usersadmin"], (old: User[] | undefined) => {
          if (old != undefined) {
            return [...old, responseJson];
          }
          return [];
        });
        return responseJson;
      }
    },
    retry: 0,
  });
}

export function useUpdateUser(onSuccess: Function) {
  const { enqueueSnackbar } = useSnackbar();
  const route = "users";
  const authHeader = useAuthHeader();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updatedUser: User) => {
      const response = await PATCHFetch(route, updatedUser, authHeader());

      if (!response.ok) {
        if (response.status == 422) {
          enqueueSnackbar("One or More Required Fields Not Entered!", {
            variant: "error",
          });
          throw Error("Incomplete form, check network logs for details");
        } else {
          enqueueSnackbar("Unknown Error Occurred!", { variant: "error" });
          throw Error("Unknown Error: " + response.status);
        }
      } else {
        onSuccess();
        const responseJson = await response.json();

        // Update the user on the users list
        queryClient.setQueryData(["usersadmin"], (old: User[] | undefined) => {
          if (old != undefined) {
            let newUsersList = [...old];
            const userIndex = old?.findIndex(
              (user) => user.id === responseJson["id"],
            );

            if (userIndex != undefined && userIndex != -1) {
              newUsersList[userIndex] = responseJson;
            }

            return newUsersList;
          }
          return [];
        });
        return responseJson;
      }
    },
    retry: 0,
  });
}

export function useCreateWell(onSuccess: Function) {
  const { enqueueSnackbar } = useSnackbar();
  const route = "wells";
  const authHeader = useAuthHeader();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (new_well: SubmitWellCreate) => {
      const response = await POSTFetch(route, new_well, authHeader());

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

export function useCreateRole(onSuccess: Function) {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const route = "roles";
  const authHeader = useAuthHeader();

  return useMutation({
    mutationFn: async (new_role: UserRole) => {
      const response = await POSTFetch(route, new_role, authHeader());

      if (!response.ok) {
        if (response.status == 422) {
          enqueueSnackbar("One or More Required Fields Not Entered!", {
            variant: "error",
          });
          throw Error("Incomplete form, check network logs for details");
        } else {
          enqueueSnackbar("Unknown Error Occurred!", { variant: "error" });
          throw Error("Unknown Error: " + response.status);
        }
      } else {
        onSuccess();

        const responseJson = await response.json();
        queryClient.setQueryData(["roles"], (old: UserRole[] | undefined) => {
          if (old != undefined) {
            return [...old, responseJson];
          }
          return [];
        });
        return responseJson;
      }
    },
    retry: 0,
  });
}

export function useUpdateWell(onSuccess: Function) {
  const { enqueueSnackbar } = useSnackbar();
  const route = "wells";
  const authHeader = useAuthHeader();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updatedWell: WellUpdate) => {
      const response = await PATCHFetch(route, updatedWell, authHeader());

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

        // Since query data will be based on params, iterate through all possible queries of this route
        const wellsQueries = queryClient.getQueryCache().findAll("wells");

        wellsQueries.forEach((query: any) => {
          queryClient.setQueryData(
            query.queryKey,
            (old: Page<Well> | undefined) => {
              if (old != undefined) {
                let newPage = JSON.parse(JSON.stringify(old)); // Deep copy so we can edit

                // If well found on the old query data, update it
                const wellIndex = old.items.findIndex(
                  (well: Well) => well.id == responseJson["id"],
                );
                if (wellIndex != undefined && wellIndex != -1) {
                  newPage.items[wellIndex] = responseJson;
                }
                return newPage;
              }
              return { items: [], total: 0, limit: 0, offset: 0 }; // Empty page if no old data
            },
          );
        });
        return responseJson;
      }
    },
    retry: 0,
  });
}

export function useUpdateRole(onSuccess: Function) {
  const { enqueueSnackbar } = useSnackbar();
  const route = "roles";
  const authHeader = useAuthHeader();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updatedRole: UserRole) => {
      const response = await PATCHFetch(route, updatedRole, authHeader());

      if (!response.ok) {
        if (response.status == 422) {
          enqueueSnackbar("One or More Required Fields Not Entered!", {
            variant: "error",
          });
          throw Error("Incomplete form, check network logs for details");
        } else {
          enqueueSnackbar("Unknown Error Occurred!", { variant: "error" });
          throw Error("Unknown Error: " + response.status);
        }
      } else {
        onSuccess();
        const responseJson = await response.json();

        // Update the part on the parts list
        queryClient.setQueryData(["roles"], (old: UserRole[] | undefined) => {
          if (old != undefined) {
            let newRoles = [...old];
            const roleIndex = old?.findIndex(
              (role) => role.id === responseJson["id"],
            );

            if (roleIndex != undefined && roleIndex != -1) {
              newRoles[roleIndex] = responseJson;
            }

            return newRoles;
          }
          return [];
        });
        return responseJson;
      }
    },
    retry: 0,
  });
}

export function useUpdateUserPassword(onSuccess: Function) {
  const { enqueueSnackbar } = useSnackbar();
  const route = "users/update_password";
  const authHeader = useAuthHeader();

  return useMutation({
    mutationFn: async (updatedUserPassword: UpdatedUserPassword) => {
      const response = await POSTFetch(
        route,
        updatedUserPassword,
        authHeader(),
      );

      if (!response.ok) {
        if (response.status == 422) {
          enqueueSnackbar("One or More Required Fields Not Entered!", {
            variant: "error",
          });
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

export function useUpdateMeterType(onSuccess: Function) {
  const { enqueueSnackbar } = useSnackbar();
  const route = "meter_types";
  const authHeader = useAuthHeader();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (meterType: Partial<MeterTypeLU>) => {
      const response = await PATCHFetch(route, meterType, authHeader());

      if (!response.ok) {
        if (response.status == 422) {
          enqueueSnackbar("One or More Required Fields Not Entered!", {
            variant: "error",
          });
          throw Error("Incomplete form, check network logs for details");
        } else {
          enqueueSnackbar("Unknown Error Occurred!", { variant: "error" });
          throw Error("Unknown Error: " + response.status);
        }
      } else {
        onSuccess();

        const responseJson = await response.json();

        // Update the part on the parts list
        queryClient.setQueryData(
          ["meter_types"],
          (old: MeterTypeLU[] | undefined) => {
            if (old != undefined) {
              let newMeterTypesList = [...old];
              const typeIndex = old?.findIndex(
                (type) => type.id === responseJson["id"],
              );

              if (typeIndex != undefined && typeIndex != -1) {
                newMeterTypesList[typeIndex] = responseJson;
              }

              return newMeterTypesList;
            }
            return [];
          },
        );
        return responseJson;
      }
    },
    retry: 0,
  });
}

export function useCreateMeter(onSuccess: Function) {
  const { enqueueSnackbar } = useSnackbar();
  const route = "meters";
  const authHeader = useAuthHeader();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (meter: Meter) => {
      const response = await POSTFetch(route, meter, authHeader());

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
        return responseJson;
      }
    },
    retry: 0,
  });
}

export function useCreateMeterType(onSuccess: Function) {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const route = "meter_types";
  const authHeader = useAuthHeader();

  return useMutation({
    mutationFn: async (meter_type: MeterTypeLU) => {
      const response = await POSTFetch(route, meter_type, authHeader());

      if (!response.ok) {
        if (response.status == 422) {
          enqueueSnackbar("One or More Required Fields Not Entered!", {
            variant: "error",
          });
          throw Error("Incomplete form, check network logs for details");
        } else {
          enqueueSnackbar("Unknown Error Occurred!", { variant: "error" });
          throw Error("Unknown Error: " + response.status);
        }
      } else {
        onSuccess();

        const responseJson = await response.json();
        queryClient.setQueryData(
          ["meter_types"],
          (old: MeterTypeLU[] | undefined) => {
            if (old != undefined) {
              return [...old, responseJson];
            }
            return [];
          },
        );
        return responseJson;
      }
    },
    retry: 0,
  });
}

export function useUpdatePart(onSuccess: Function) {
  const { enqueueSnackbar } = useSnackbar();
  const route = "part";
  const authHeader = useAuthHeader();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (part: Partial<Part>) => {
      console.log(part);
      const response = await PATCHFetch(route, part, authHeader());

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
          throw Error("Part serial number already in database");
        } else {
          enqueueSnackbar("Unknown Error Occurred!", { variant: "error" });
          throw Error("Unknown Error: " + response.status);
        }
      } else {
        onSuccess();

        const responseJson = await response.json();

        // Update the part on the parts list
        queryClient.setQueryData(["parts"], (old: Part[] | undefined) => {
          if (old != undefined) {
            let newPartsList = [...old];
            const partIndex = old?.findIndex(
              (part) => part.id === responseJson["id"],
            );

            if (partIndex != undefined && partIndex != -1) {
              newPartsList[partIndex] = responseJson;
            }

            return newPartsList;
          }
          return [];
        });
        return responseJson;
      }
    },
    retry: 0,
  });
}

export function useUpdateMeter(onSuccess: Function) {
  const { enqueueSnackbar } = useSnackbar();
  const route = "meter";
  const authHeader = useAuthHeader();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (meterDetails: Meter) => {
      const response = await PATCHFetch(route, meterDetails, authHeader());

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

        // Since query data will be based on params, iterate through all possible queries of this route
        const meterQueries = queryClient.getQueryCache().findAll("meters");

        meterQueries.forEach((query: any) => {
          queryClient.setQueryData(
            query.queryKey,
            (old: Page<Meter> | undefined) => {
              if (old != undefined) {
                let newPage = JSON.parse(JSON.stringify(old)); // Deep copy so we can edit

                // If well found on the old query data, update it
                const meterIndex = old.items.findIndex(
                  (meter: Meter) => meter.id == responseJson["id"],
                );
                if (meterIndex != undefined && meterIndex != -1) {
                  newPage.items[meterIndex] = responseJson;
                }
                return newPage;
              }
              return { items: [], total: 0, limit: 0, offset: 0 }; // Empty page if no old data
            },
          );
        });
        return responseJson;
      }
    },
    retry: 0,
  });
}

export function useUpdateObservation(onSuccess: Function) {
  const { enqueueSnackbar } = useSnackbar();
  const route = "observations";
  const authHeader = useAuthHeader();

  return useMutation({
    mutationFn: async (observation: PatchObservationSubmit) => {
      const response = await PATCHFetch(route, observation, authHeader());

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
          throw Error("Observation serial number already in database");
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

export function useDeleteObservation(onSuccess: Function) {
  const { enqueueSnackbar } = useSnackbar();
  const authHeader = useAuthHeader();

  return useMutation({
    mutationFn: async (observation_id: number) => {
      const response = await fetch(
        `${API_URL}/observations?observation_id=${observation_id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: authHeader(),
          },
        },
      );

      if (!response.ok) {
        enqueueSnackbar("Unknown Error Occurred!", { variant: "error" });
        throw Error("Unknown Error: " + response.status);
      } else {
        onSuccess();
        return true;
      }
    },
    retry: 0,
  });
}

export function useUpdateActivity(onSuccess: Function) {
  const { enqueueSnackbar } = useSnackbar();
  const route = "activities";
  const authHeader = useAuthHeader();

  return useMutation({
    mutationFn: async (activityForm: PatchActivitySubmit) => {
      const response = await PATCHFetch(route, activityForm, authHeader());

      // This responsibility will eventually move to callsite when special error codes arent relied on
      if (!response.ok) {
        if (response.status == 422) {
          enqueueSnackbar("One or More Required Fields Not Entered!", {
            variant: "error",
          });
          throw Error("Incomplete form, check network logs for details");
        }
        if (response.status == 409) {
          //There could be a couple reasons for this... out of order activity or duplicate activity
          let errorText = await response.text();
          enqueueSnackbar(JSON.parse(errorText).detail, { variant: "error" });
          throw Error(errorText);
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

export function useDeleteActivity(onSuccess: Function) {
  const { enqueueSnackbar } = useSnackbar();
  const authHeader = useAuthHeader();

  return useMutation({
    mutationFn: async (activity_id: number) => {
      const response = await fetch(
        `${API_URL}/activities?activity_id=${activity_id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: authHeader(),
          },
        },
      );

      if (!response.ok) {
        enqueueSnackbar("Unknown Error Occurred!", { variant: "error" });
        throw Error("Unknown Error: " + response.status);
      } else {
        onSuccess();
        return true;
      }
    },
    retry: 0,
  });
}

export function useCreatePart(onSuccess: Function) {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const route = "parts";
  const authHeader = useAuthHeader();

  return useMutation({
    mutationFn: async (part: Part) => {
      try {
        if (!part.part_type?.id) {
          throw new Error("part_type_id is required but missing");
        }

        // Due to the way the form gets generated for a new part,
        // I need to populate part_type_id manually here
        part.part_type_id = part.part_type?.id;

        const response = await POSTFetch(route, part, authHeader());

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
            throw Error("Part serial number already in database");
          } else {
            enqueueSnackbar("Unknown Error Occurred!", { variant: "error" });
            throw Error("Unknown Error: " + response.status);
          }
        } else {
          onSuccess();

          const responseJson = await response.json();
          queryClient.setQueryData(["parts"], (old: Part[] | undefined) => {
            if (old != undefined) {
              return [...old, responseJson];
            }
            return [];
          });
          return responseJson;
        }
      } catch {
        enqueueSnackbar(
          "An Error Occurred, Please Ensure the Part Number is Unique",
          { variant: "error" },
        );
        throw Error(
          "Server side error while creating a part, likely due to a non-unique part number.",
        );
      }
    },
    retry: 0,
  });
}

export function useCreateChlorideMeasurement() {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const route = "chlorides";
  const authHeader = useAuthHeader();

  return useMutation({
    mutationFn: async (newChlorideMeasurement: NewWellMeasurement) => {
      const response = await POSTFetch(
        route,
        newChlorideMeasurement,
        authHeader(),
      );

      if (!response.ok) {
        if (response.status == 422) {
          enqueueSnackbar("One or More Required Fields Not Entered!", {
            variant: "error",
          });
          throw Error("Incomplete form, check network logs for details");
        } else {
          enqueueSnackbar("Unknown Error Occurred!", { variant: "error" });
          throw Error("Unknown Error: " + response.status);
        }
      } else {
        enqueueSnackbar("Successfully Created New Measurement!", {
          variant: "success",
        });

        const responseJson = await response.json();

        queryClient.setQueryData(
          [route, { well_id: responseJson["well_id"] }],
          (old: WellMeasurementDTO[] | undefined) => {
            return [...(old ?? []), responseJson];
          },
        );
        return responseJson;
      }
    },
    retry: 0,
  });
}

export function useCreateWaterLevel() {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const route = "waterlevels";
  const authHeader = useAuthHeader();

  return useMutation({
    mutationFn: async (newWaterLevel: Partial<NewWellMeasurement>) => {
      const response = await POSTFetch(route, newWaterLevel, authHeader());

      if (!response.ok) {
        if (response.status == 422) {
          enqueueSnackbar("One or More Required Fields Not Entered!", {
            variant: "error",
          });
          throw Error("Incomplete form, check network logs for details");
        } else {
          enqueueSnackbar("Unknown Error Occurred!", { variant: "error" });
          throw Error("Unknown Error: " + response.status);
        }
      } else {
        enqueueSnackbar("Successfully Created New Measurement!", {
          variant: "success",
        });

        const responseJson = await response.json();

        queryClient.setQueryData(
          [route, { well_id: responseJson["well_id"] }],
          (old: WellMeasurementDTO[] | undefined) => {
            return [...(old ?? []), responseJson];
          },
        );
        return responseJson;
      }
    },
    retry: 0,
  });
}

export function useUpdateWaterLevel(onSuccess: Function) {
  const { enqueueSnackbar } = useSnackbar();
  const route = "waterlevels";
  const authHeader = useAuthHeader();

  return useMutation({
    mutationFn: async (updatedWaterLevel: Partial<PatchWellMeasurement>) => {
      const response = await PATCHFetch(route, updatedWaterLevel, authHeader());

      if (!response.ok) {
        if (response.status == 422) {
          enqueueSnackbar("One or More Required Fields Not Entered!", {
            variant: "error",
          });
          throw Error("Incomplete form, check network logs for details");
        } else {
          enqueueSnackbar("Unknown Error Occurred!", { variant: "error" });
          throw Error("Unknown Error: " + response.status);
        }
      } else {
        enqueueSnackbar("Successfully Updated Measurement!", {
          variant: "success",
        });
        onSuccess(); //Success function should be used to update measurement table

        const responseJson = await response.json();

        //Update the water levels previously queried using queryClient **Under development!!
        // queryClient.setQueryData([route, {well_id: responseJson["well_id"]}], (old: WellMeasurementDTO[] | undefined) => {
        //     if (old != undefined) {
        //         let newWaterLevels = [...old]
        //         const waterLevelIndex = old.findIndex(waterLevel => waterLevel.id === responseJson["id"])

        //         if (waterLevelIndex != undefined && waterLevelIndex != -1) {
        //             newWaterLevels[waterLevelIndex] = responseJson
        //         }

        //         return newWaterLevels
        //     }
        //     return []
        // })

        return responseJson;
      }
    },
    retry: 0,
  });
}

export function useDeleteWaterLevel() {
  const { enqueueSnackbar } = useSnackbar();
  const authHeader = useAuthHeader();

  return useMutation({
    mutationFn: async (waterLevelID: number) => {
      const response = await fetch(
        `${API_URL}/waterlevels?waterlevel_id=${waterLevelID}`,
        {
          method: "DELETE",
          headers: {
            Authorization: authHeader(),
            "Content-type": "application/json",
          },
        },
      );

      if (!response.ok) {
        enqueueSnackbar("Unknown Error Occurred!", { variant: "error" });
        throw Error("Unknown Error: " + response.status);
      } else {
        enqueueSnackbar("Successfully Deleted Measurement!", {
          variant: "success",
        });

        return true;
      }
    },
    retry: 0,
  });
}

export function useMergeWells(onSuccess: Function) {
  const { enqueueSnackbar } = useSnackbar();
  const route = "merge_wells";
  const authHeader = useAuthHeader();

  return useMutation({
    mutationFn: async (mergeWells: WellMergeParams) => {
      console.log(mergeWells);
      const response = await POSTFetch(route, mergeWells, authHeader());

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

export function useUpdateWorkOrder() {
  const { enqueueSnackbar } = useSnackbar();
  const route = "work_orders";
  const authHeader = useAuthHeader();

  return useMutation({
    mutationFn: async (workOrder: PatchWorkOrder) => {
      const response = await PATCHFetch(route, workOrder, authHeader());

      if (!response.ok) {
        if (response.status == 409) {
          enqueueSnackbar("Title must be unique for date and meter", {
            variant: "error",
          });
          throw Error(
            "Failure of date, meter, and title uniqueness constraint",
          );
        }
        if (response.status == 422) {
          enqueueSnackbar("Title cannot be blank", { variant: "error" });
          throw Error("Title is empty string");
        } else {
          enqueueSnackbar("Unknown Error Occurred!", { variant: "error" });
          throw Error("Unknown Error: " + response.status);
        }
      } else {
        const responseJson = await response.json();
        return responseJson;
      }
    },
    retry: 0,
  });
}

export function useDeleteWorkOrder(onSuccess: Function) {
  const { enqueueSnackbar } = useSnackbar();
  const authHeader = useAuthHeader();

  return useMutation({
    mutationFn: async (workOrderID: number) => {
      const response = await fetch(
        `${API_URL}/work_orders?work_order_id=${workOrderID}`,
        {
          method: "DELETE",
          headers: {
            Authorization: authHeader(),
          },
        },
      );

      if (!response.ok) {
        enqueueSnackbar("Unknown Error Occurred!", { variant: "error" });
        throw Error("Unknown Error: " + response.status);
      } else {
        onSuccess();
        return true;
      }
    },
    retry: 0,
  });
}

export function useCreateWorkOrder() {
  const { enqueueSnackbar } = useSnackbar();
  const route = "work_orders";
  const authHeader = useAuthHeader();

  return useMutation({
    mutationFn: async (workOrder: NewWorkOrder) => {
      const response = await POSTFetch(route, workOrder, authHeader());

      if (!response.ok) {
        if (response.status == 409) {
          enqueueSnackbar("Title must be unique for date and meter", {
            variant: "error",
          });
          throw Error(
            "Failure of date, meter, and title uniqueness constraint",
          );
        }
        if (response.status == 422) {
          enqueueSnackbar("Title cannot be blank", { variant: "error" });
          throw Error("Title is empty string");
        } else {
          enqueueSnackbar("Unknown Error Occurred!", { variant: "error" });
          throw Error("Unknown Error: " + response.status);
        }
      } else {
        const responseJson = await response.json();
        return responseJson;
      }
    },
    retry: 0,
  });
}

export function useAddParts(onSuccess?: () => void) {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const authHeader = useAuthHeader();

  const route = "parts/add";

  return useMutation({
    mutationFn: async (payload: IncreaseQuantityPayload) => {
      const response = await POSTFetch(route, payload, authHeader());

      if (!response.ok) {
        if (response.status === 404) {
          enqueueSnackbar("Part not found.", { variant: "error" });
          throw new Error("Part not found (404)");
        }

        if (response.status === 422) {
          enqueueSnackbar("Missing or invalid fields.", { variant: "error" });
          throw new Error("Validation error (422)");
        }

        // Optional: read backend detail if present
        let detail = "";
        try {
          const j = await response.json();
          detail = j?.detail ? ` (${j.detail})` : "";
        } catch {}

        enqueueSnackbar(
          `Unknown error occurred! (${response.status})${detail}`,
          {
            variant: "error",
          },
        );
        throw new Error(`Unknown Error: ${response.status}${detail}`);
      }

      const updatedPart: Part = await response.json();

      // update any cached parts lists you have
      queryClient.setQueryData<Part[]>(["parts"], (old) => {
        const safeOld = old ?? [];
        return safeOld.map((p) => (p.id === updatedPart.id ? updatedPart : p));
      });

      onSuccess?.();
      return updatedPart;
    },
    retry: 0,
  });
}

export function useGetPartHistory(partId?: string) {
  const authHeader = useAuthHeader();
  const navigate = useNavigate();
  const signOut = useSignOut();

  return useQuery<PartHistoryResponse, Error>(
    ["parts-history", partId],
    () =>
      GETFetch(
        `parts/${partId}/history`,
        null,
        authHeader(),
        signOut,
        navigate,
      ),
    { enabled: !!partId, keepPreviousData: true },
  );
}

export function useUpdatePartHistory(
  partId?: string,
  onSuccess?: (response: PartHistoryResponse) => void,
) {
  const { enqueueSnackbar } = useSnackbar();
  const authHeader = useAuthHeader();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdatePartHistoryPayload) => {
      if (!partId) {
        throw new Error("Missing part id");
      }

      const response = await PATCHFetch(
        `parts/${partId}/history`,
        payload,
        authHeader(),
      );

      if (!response.ok) {
        let detail = "";
        try {
          const json = await response.json();
          detail = json?.detail ? ` (${json.detail})` : "";
        } catch {}

        if (response.status === 404) {
          enqueueSnackbar(`Part history row not found${detail}`, {
            variant: "error",
          });
          throw new Error(`Part history row not found${detail}`);
        }

        if (response.status === 422) {
          enqueueSnackbar(`Invalid history update${detail}`, {
            variant: "error",
          });
          throw new Error(`Invalid history update${detail}`);
        }

        enqueueSnackbar(
          `Unknown error occurred! (${response.status})${detail}`,
          {
            variant: "error",
          },
        );
        throw new Error(`Unknown Error: ${response.status}${detail}`);
      }

      const responseJson: PartHistoryResponse = await response.json();

      queryClient.setQueryData(["parts-history", partId], responseJson);
      queryClient.invalidateQueries({ queryKey: ["parts"] });
      queryClient.invalidateQueries({ queryKey: ["part"] });

      onSuccess?.(responseJson);
      return responseJson;
    },
    retry: 0,
  });
}
