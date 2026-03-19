import { useAuthHeader, useSignOut } from "react-auth-kit";
import { useNavigate } from "@tanstack/react-router";
import { formatQueryParams } from "@/utils";
import { enqueueSnackbar } from "notistack";
import { HttpStatus } from "@/enums";
import { API_URL } from "@/config";
import { clearTrackedSession, notifyTrackedLogout } from "@/utils/SessionTracking";

export const useFetchWithAuth = () => {
  const authHeader = useAuthHeader();
  const signOut = useSignOut();
  const navigate = useNavigate();

  return async ({
    method = "GET",
    route,
    params = {},
    body,
    responseType = "json",
  }: {
    method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
    route: string;
    params?: Record<string, any>;
    body?: any;
    responseType?: "json" | "blob" | "text" | "response";
  }) => {
    const url = `${API_URL}${route}${formatQueryParams(params)}`;
    const isFormData = body instanceof FormData;

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: authHeader(),
        // Only set JSON content-type when sending JSON
        ...(body &&
        !isFormData &&
        ["PATCH", "POST", "PUT", "DELETE"].includes(method)
          ? { "Content-Type": "application/json" }
          : {}),
      },
      body:
        body && ["PATCH", "POST", "PUT", "DELETE"].includes(method)
          ? isFormData
            ? body
            : JSON.stringify(body)
          : undefined,
    });

    if (!response.ok) {
      if (
        response.status === HttpStatus.LOGIN_TIMEOUT &&
        localStorage.getItem("loggedIn")
      ) {
        void notifyTrackedLogout("session_expired");
        localStorage.removeItem("loggedIn");
        localStorage.removeItem("_auth");
        clearTrackedSession();
        navigate({ to: "/" });
        signOut();
        enqueueSnackbar("Session expired. Please log in to continue.", {
          variant: "error",
        });
      }

      // try to read error body if available
      let detail = "";
      try {
        detail = await response.text();
      } catch {}
      throw new Error(
        `[ERROR] HTTP Status: ${response.status} - ${response.statusText}${
          detail ? ` - ${detail}` : ""
        }`,
      );
    }

    if (responseType === "response") return response;
    if (responseType === "blob") return response.blob();
    if (responseType === "text") return response.text();
    return response.json();
  };
};
