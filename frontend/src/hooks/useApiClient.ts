import { useAuthHeader, useSignOut } from "react-auth-kit";
import { useNavigate } from "@tanstack/react-router";
import { formatQueryParams } from "@/utils";
import { API_URL } from "@/config";
import { handleExpiredSession } from "@/utils/AuthSession";

function formatRoute(route: string) {
  return route.replace(/^\/+/, "");
}

function buildUrl(route: string, params?: Record<string, any>) {
  return `${API_URL}/${formatRoute(route)}${formatQueryParams(params ?? {})}`;
}

export const useApiClient = () => {
  const authHeader = useAuthHeader();
  const signOut = useSignOut();
  const navigate = useNavigate();

  const request = ({
    method = "GET",
    route,
    params,
    body,
  }: {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    route: string;
    params?: Record<string, any>;
    body?: any;
  }) => {
    return fetch(buildUrl(route, params), {
      method,
      headers: {
        Authorization: authHeader(),
        ...(body !== undefined ? { "Content-type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  };

  const get = async (route: string, params?: Record<string, any>) => {
    const response = await request({ method: "GET", route, params });

    if (!response.ok) {
      if (response.status === 440 && localStorage.getItem("loggedIn")) {
        handleExpiredSession({
          signOut,
          navigate,
          message: "Your session has expired, please login again.",
        });
      }

      throw new Error(response.status.toString());
    }

    return response.json();
  };

  return {
    get,
    post: (route: string, body: any) =>
      request({ method: "POST", route, body }),
    patch: (route: string, body: any) =>
      request({ method: "PATCH", route, body }),
    delete: (route: string, params?: Record<string, any>) =>
      request({ method: "DELETE", route, params }),
  };
};
