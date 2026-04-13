export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
export const APP_ENV =
  import.meta.env.VITE_APP_ENV ||
  (import.meta.env.DEV ? "development" : "production");
export const ALLOW_IMPERSONATION =
  APP_ENV === "development" || APP_ENV === "pre-production";

export const ROLE_IDS = {
  TECHNICIAN: 1,
  ADMIN: 2,
  OSE: 3,
};
