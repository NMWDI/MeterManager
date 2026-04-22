import { useSnackbar } from "notistack";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { useApiClient } from "@/hooks";
import { IncreaseQuantityPayload } from "@/interfaces";
import { MeterTypeLU, Part } from "@/interfaces";
import {
  PartHistoryResponse,
  UpdatePartHistoryPayload,
} from "@/interfaces/PartHistoryResponse";

export function useGetParts() {
  const apiClient = useApiClient();
  const route = "parts";

  return useQuery<Part[], Error>([route], () => apiClient.get(route), {
    keepPreviousData: true,
  });
}

export function useGetPart(params: { part_id: number } | undefined) {
  const apiClient = useApiClient();
  const route = "part";

  return useQuery<Part, Error>(
    [route, params],
    () => apiClient.get(route, params),
    {
      keepPreviousData: true,
      enabled: params?.part_id != undefined,
    },
  );
}

export function useUpdateMeterType(onSuccess: Function) {
  const { enqueueSnackbar } = useSnackbar();
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const route = "meter_types";

  return useMutation({
    mutationFn: async (meterType: Partial<MeterTypeLU>) => {
      const response = await apiClient.patch(route, meterType);

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

export function useCreateMeterType(onSuccess: Function) {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const apiClient = useApiClient();
  const route = "meter_types";

  return useMutation({
    mutationFn: async (meter_type: MeterTypeLU) => {
      const response = await apiClient.post(route, meter_type);

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

        queryClient.invalidateQueries({
          queryKey: [route],
        });

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
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const route = "part";

  return useMutation({
    mutationFn: async (part: Partial<Part>) => {
      console.log(part);
      const response = await apiClient.patch(route, part);

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

export function useCreatePart(onSuccess: Function) {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const apiClient = useApiClient();
  const route = "parts";

  return useMutation({
    mutationFn: async (part: Part) => {
      try {
        if (!part.part_type?.id) {
          throw new Error("part_type_id is required but missing");
        }

        part.part_type_id = part.part_type?.id;

        const response = await apiClient.post(route, part);

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

          queryClient.invalidateQueries({
            queryKey: [route],
          });

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

export function useAddParts(onSuccess?: () => void) {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const apiClient = useApiClient();
  const route = "parts/add";

  return useMutation({
    mutationFn: async (payload: IncreaseQuantityPayload) => {
      const response = await apiClient.post(route, payload);

      if (!response.ok) {
        if (response.status === 404) {
          enqueueSnackbar("Part not found.", { variant: "error" });
          throw new Error("Part not found (404)");
        }

        if (response.status === 422) {
          enqueueSnackbar("Missing or invalid fields.", { variant: "error" });
          throw new Error("Validation error (422)");
        }

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
  const apiClient = useApiClient();

  return useQuery<PartHistoryResponse, Error>(
    ["parts-history", partId],
    () => apiClient.get(`parts/${partId}/history`),
    { enabled: !!partId, keepPreviousData: true },
  );
}

export function useUpdatePartHistory(
  partId?: string,
  onSuccess?: (response: PartHistoryResponse) => void,
) {
  const { enqueueSnackbar } = useSnackbar();
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdatePartHistoryPayload) => {
      if (!partId) {
        throw new Error("Missing part id");
      }

      const response = await apiClient.patch(
        `parts/${partId}/history`,
        payload,
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
