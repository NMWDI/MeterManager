import { useQuery } from "react-query";
import { useApiClient } from "@/hooks";
import {
  ActivityTypeLU,
  HomeSummary,
  MeterRegister,
  MeterStatus,
  MeterTypeLU,
  NoteTypeLU,
  ObservedPropertyTypeLU,
  PartTypeLU,
  SecurityScope,
  ServiceTypeLU,
  WaterSource,
  WellStatus,
  WellUseLU,
} from "@/interfaces";

export function useGetUseTypes() {
  const apiClient = useApiClient();
  const route = "use_types";

  return useQuery<WellUseLU[], Error>([route], () => apiClient.get(route), {
    keepPreviousData: true,
  });
}

export function useGetWaterSources() {
  const apiClient = useApiClient();
  const route = "water_sources";

  return useQuery<WaterSource[], Error>([route], () => apiClient.get(route), {
    keepPreviousData: true,
  });
}

export function useGetWellStatusTypes() {
  const apiClient = useApiClient();
  const route = "well_status_types";

  return useQuery<WellStatus[], Error>([route], () => apiClient.get(route), {
    keepPreviousData: true,
  });
}

export function useGetMeterTypeList() {
  const apiClient = useApiClient();
  const route = "meter_types";

  return useQuery<MeterTypeLU[], Error>([route], () => apiClient.get(route));
}

export function useGetHomeSummary() {
  const apiClient = useApiClient();
  const route = "maintenance/home_summary";

  return useQuery<HomeSummary, Error>([route], () => apiClient.get(route));
}

export function useGetMeterRegisterList() {
  const apiClient = useApiClient();
  const route = "meter_registers";

  return useQuery<MeterRegister[], Error>([route], () => apiClient.get(route));
}

export function useGetMeterStatusTypeList() {
  const apiClient = useApiClient();
  const route = "meter_status_types";

  return useQuery<MeterStatus[], Error>([route], () => apiClient.get(route));
}

export function useGetNoteTypes() {
  const apiClient = useApiClient();
  const route = "note_types";

  return useQuery<NoteTypeLU[], Error>([route], () => apiClient.get(route));
}

export function useGetSecurityScopes() {
  const apiClient = useApiClient();
  const route = "security_scopes";

  return useQuery<SecurityScope[], Error>([route], () => apiClient.get(route));
}

export function useGetActivityTypeList() {
  const apiClient = useApiClient();
  const route = "activity_types";

  return useQuery<ActivityTypeLU[], Error>([route, null], () =>
    apiClient.get(route),
  );
}

export function useGetServiceTypes() {
  const apiClient = useApiClient();
  const route = "service_types";

  return useQuery<ServiceTypeLU[], Error>([route, null], () =>
    apiClient.get(route),
  );
}

export function useGetPropertyTypes() {
  const apiClient = useApiClient();
  const route = "observed_property_types";

  return useQuery<ObservedPropertyTypeLU[], Error>([route], () =>
    apiClient.get(route),
  );
}

export function useGetPartTypeList() {
  const apiClient = useApiClient();
  const route = "part_types";

  return useQuery<PartTypeLU[], Error>([route], () => apiClient.get(route), {
    keepPreviousData: true,
  });
}
