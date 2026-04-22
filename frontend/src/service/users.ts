import { useSnackbar } from "notistack";
import {
  useMutation,
  useQuery,
  useQueryClient,
  UseQueryOptions,
} from "react-query";
import { useApiClient } from "@/hooks";
import {
  AuthTokenResponse,
  UpdatedUserPassword,
  User,
  UserRole,
} from "@/interfaces";

export function useGetRoles(options?: UseQueryOptions<UserRole[], Error>) {
  const apiClient = useApiClient();
  const route = "roles";

  return useQuery<UserRole[], Error>(
    [route],
    () => apiClient.get(route),
    options,
  );
}

export function useGetUserAdminList(options?: UseQueryOptions<User[], Error>) {
  const apiClient = useApiClient();
  const route = "usersadmin";

  return useQuery<User[], Error>([route], () => apiClient.get(route), options);
}

export function useGetUserList() {
  const apiClient = useApiClient();
  const route = "users";

  return useQuery<User[], Error>([route], () => apiClient.get(route));
}

export function useGetUser(id: number, options = {}) {
  const apiClient = useApiClient();
  const route = "users";

  return useQuery<User, Error>(
    [route, id],
    () => apiClient.get(`${route}/${id}`),
    options,
  );
}

export function useImpersonateUser() {
  const apiClient = useApiClient();

  return useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiClient.post(
        `users/${userId}/impersonate`,
        undefined,
      );
      if (!response.ok) {
        throw new Error(await response.text());
      }

      return (await response.json()) as AuthTokenResponse;
    },
    retry: 0,
  });
}

export function useCreateUser(onSuccess: Function) {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const apiClient = useApiClient();
  const route = "users";

  return useMutation({
    mutationFn: async (user: User) => {
      const response = await apiClient.post(route, user);

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
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const route = "users";

  return useMutation({
    mutationFn: async (updatedUser: User) => {
      const response = await apiClient.patch(route, updatedUser);

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

export function useCreateRole(onSuccess: Function) {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const apiClient = useApiClient();
  const route = "roles";

  return useMutation({
    mutationFn: async (new_role: UserRole) => {
      const response = await apiClient.post(route, new_role);

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

export function useUpdateRole(onSuccess: Function) {
  const { enqueueSnackbar } = useSnackbar();
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const route = "roles";

  return useMutation({
    mutationFn: async (updatedRole: UserRole) => {
      const response = await apiClient.patch(route, updatedRole);

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
  const apiClient = useApiClient();
  const route = "users/update_password";

  return useMutation({
    mutationFn: async (updatedUserPassword: UpdatedUserPassword) => {
      const response = await apiClient.post(route, updatedUserPassword);

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
