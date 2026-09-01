import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuthHeader, useSignOut } from "@/utils/AuthKitCompat";
import { API_URL } from "@/config";
import { handleExpiredSession } from "@/utils/AuthSession";

const SESSION_STATUS_POLL_INTERVAL_MS = 15000;

export function SessionStatusPoller() {
  const authHeader = useAuthHeader();
  const signOut = useSignOut();
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    const pollSessionStatus = async () => {
      const authorization = authHeader();
      if (!authorization || document.hidden) {
        return;
      }

      try {
        const response = await fetch(`${API_URL}/user-sessions/current/status`, {
          headers: {
            Authorization: authorization,
          },
        });

        if (
          response.status === 440 &&
          localStorage.getItem("loggedIn") &&
          isMounted
        ) {
          handleExpiredSession({
            signOut,
            navigate,
          });
        }
      } catch {
        // Ignore transient network errors and try again on the next interval.
      }
    };

    void pollSessionStatus();

    const intervalId = window.setInterval(() => {
      void pollSessionStatus();
    }, SESSION_STATUS_POLL_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        void pollSessionStatus();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [authHeader, navigate, signOut]);

  return null;
}
