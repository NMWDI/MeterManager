import { useSnackbar } from "notistack";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { useApiClient } from "@/hooks";
import {
  NewWellMeasurement,
  PatchActivitySubmit,
  PatchObservationSubmit,
  PatchWellMeasurement,
  WaterLevelQueryParams,
  WellMeasurementDTO,
} from "@/interfaces";

export function useGetWaterLevels(params: WaterLevelQueryParams) {
  const apiClient = useApiClient();
  const route = "waterlevels";

  return useQuery<WellMeasurementDTO[], Error>([route, params], () =>
    apiClient.get(route, params),
  );
}

export function useGetChloridesLevels(params: WaterLevelQueryParams) {
  const apiClient = useApiClient();
  const route = "chlorides";

  return useQuery<WellMeasurementDTO[], Error>([route, params], () =>
    apiClient.get(route, params),
  );
}

export function useUpdateObservation(onSuccess: Function) {
  const { enqueueSnackbar } = useSnackbar();
  const apiClient = useApiClient();
  const route = "observations";

  return useMutation({
    mutationFn: async (observation: PatchObservationSubmit) => {
      const response = await apiClient.patch(route, observation);

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
  const apiClient = useApiClient();

  return useMutation({
    mutationFn: async (observation_id: number) => {
      const response = await apiClient.delete("observations", { observation_id });

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
  const apiClient = useApiClient();
  const route = "activities";

  return useMutation({
    mutationFn: async (activityForm: PatchActivitySubmit) => {
      const response = await apiClient.patch(route, activityForm);

      if (!response.ok) {
        if (response.status == 422) {
          enqueueSnackbar("One or More Required Fields Not Entered!", {
            variant: "error",
          });
          throw Error("Incomplete form, check network logs for details");
        }
        if (response.status == 409) {
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
  const apiClient = useApiClient();

  return useMutation({
    mutationFn: async (activity_id: number) => {
      const response = await apiClient.delete("activities", { activity_id });

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

export function useCreateChlorideMeasurement() {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const apiClient = useApiClient();
  const route = "chlorides";

  return useMutation({
    mutationFn: async (newChlorideMeasurement: NewWellMeasurement) => {
      const response = await apiClient.post(route, newChlorideMeasurement);

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
  const apiClient = useApiClient();
  const route = "waterlevels";

  return useMutation({
    mutationFn: async (newWaterLevel: Partial<NewWellMeasurement>) => {
      const response = await apiClient.post(route, newWaterLevel);

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
  const apiClient = useApiClient();
  const route = "waterlevels";

  return useMutation({
    mutationFn: async (updatedWaterLevel: Partial<PatchWellMeasurement>) => {
      const response = await apiClient.patch(route, updatedWaterLevel);

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
        onSuccess();

        const responseJson = await response.json();
        return responseJson;
      }
    },
    retry: 0,
  });
}

export function useDeleteWaterLevel() {
  const { enqueueSnackbar } = useSnackbar();
  const apiClient = useApiClient();

  return useMutation({
    mutationFn: async (waterLevelID: number) => {
      const response = await apiClient.delete("waterlevels", {
        waterlevel_id: waterLevelID,
      });

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
