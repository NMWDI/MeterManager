import type { AuthTokenResponse, StoredImpersonationSession, User } from "@/interfaces";
import { clearTrackedSession, persistTrackedSession } from "./SessionTracking";

const IMPERSONATION_STORAGE_KEY = "wmdb.impersonation";
type SignInFunction = (params: {
  token: string;
  expiresIn: number;
  tokenType: string;
  authState?: User;
}) => boolean;

function parseStoredImpersonation(value: string | null): StoredImpersonationSession | null {
  if (!value) return null;

  try {
    return JSON.parse(value) as StoredImpersonationSession;
  } catch {
    return null;
  }
}

export function getStoredImpersonation() {
  return parseStoredImpersonation(window.localStorage.getItem(IMPERSONATION_STORAGE_KEY));
}

export function isImpersonating() {
  return getStoredImpersonation() !== null;
}

export function clearStoredImpersonation() {
  window.localStorage.removeItem(IMPERSONATION_STORAGE_KEY);
}

export function beginImpersonationSession(options: {
  signIn: SignInFunction;
  actorUser: User;
  actorToken: string;
  actorSessionIdentifier?: string | null;
  response: AuthTokenResponse;
  fingerprintHash?: string | null;
}) {
  const { signIn, actorUser, actorToken, actorSessionIdentifier, response, fingerprintHash } =
    options;

  if (!response.access_token || !response.user) {
    return false;
  }

  const impersonationState: StoredImpersonationSession = {
    actorToken,
    actorUser,
    actorSessionIdentifier,
    impersonatedUser: response.user,
    impersonatedSessionIdentifier: response.session_identifier ?? null,
    startedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(
    IMPERSONATION_STORAGE_KEY,
    JSON.stringify(impersonationState),
  );

  const signedIn = signIn({
    token: response.access_token,
    expiresIn: 300,
    tokenType: response.token_type || "bearer",
    authState: response.user,
  });

  if (!signedIn) {
    clearStoredImpersonation();
    return false;
  }

  window.localStorage.setItem("_auth", response.access_token);
  window.localStorage.setItem("loggedIn", "true");

  if (response.session_identifier && fingerprintHash) {
    persistTrackedSession(response.session_identifier, fingerprintHash);
  } else {
    clearTrackedSession();
  }

  return true;
}

export function endImpersonationSession(options: {
  signIn: SignInFunction;
  fingerprintHash?: string | null;
}) {
  const { signIn, fingerprintHash } = options;
  const storedSession = getStoredImpersonation();

  if (!storedSession) {
    return false;
  }

  const signedIn = signIn({
    token: storedSession.actorToken,
    expiresIn: 300,
    tokenType: "bearer",
    authState: storedSession.actorUser,
  });

  if (!signedIn) {
    return false;
  }

  window.localStorage.setItem("_auth", storedSession.actorToken);
  window.localStorage.setItem("loggedIn", "true");

  if (storedSession.actorSessionIdentifier && fingerprintHash) {
    persistTrackedSession(storedSession.actorSessionIdentifier, fingerprintHash);
  } else {
    clearTrackedSession();
  }

  clearStoredImpersonation();

  return true;
}
