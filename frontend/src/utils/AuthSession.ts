import { enqueueSnackbar } from "notistack";
import { clearTrackedSession, notifyTrackedLogout } from "@/utils/SessionTracking";

let isHandlingExpiredSession = false;

export function handleExpiredSession(options: {
  signOut: () => unknown;
  navigate: (options: { to: string }) => unknown;
  message?: string;
}) {
  if (isHandlingExpiredSession || !localStorage.getItem("loggedIn")) {
    return;
  }

  isHandlingExpiredSession = true;

  void notifyTrackedLogout("session_expired");
  localStorage.removeItem("loggedIn");
  localStorage.removeItem("_auth");
  clearTrackedSession();
  options.navigate({ to: "/" });
  options.signOut();
  enqueueSnackbar(
    options.message ?? "Session expired. Please log in to continue.",
    {
      variant: "error",
    },
  );

  window.setTimeout(() => {
    isHandlingExpiredSession = false;
  }, 1000);
}
