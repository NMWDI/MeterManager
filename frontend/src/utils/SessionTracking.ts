import { API_URL } from "@/config";

const SESSION_IDENTIFIER_STORAGE_KEY = "wmdb_session_identifier";
const SESSION_FINGERPRINT_STORAGE_KEY = "wmdb_session_fingerprint";

export type SessionTrackingMetadata = {
  browser: string;
  operatingSystem: string;
  deviceType: string;
  deviceLabel: string;
  fingerprintHash: string;
};

let sessionTrackingMetadataPromise: Promise<SessionTrackingMetadata> | null = null;

function parseBrowser(userAgent: string) {
  const browserMatchers: Array<[RegExp, string]> = [
    [/Edg\//, "Microsoft Edge"],
    [/OPR\//, "Opera"],
    [/SamsungBrowser\//, "Samsung Internet"],
    [/CriOS\//, "Chrome (iOS)"],
    [/Chrome\//, "Chrome"],
    [/Chromium\//, "Chromium"],
    [/FxiOS\//, "Firefox (iOS)"],
    [/Firefox\//, "Firefox"],
    [/Version\/.*Safari\//, "Safari"],
  ];

  return browserMatchers.find(([pattern]) => pattern.test(userAgent))?.[1] ?? "Unknown Browser";
}

function parseOperatingSystem(userAgent: string) {
  const operatingSystemMatchers: Array<[RegExp, string]> = [
    [/Windows NT/i, "Windows"],
    [/Android/i, "Android"],
    [/iPhone/i, "iOS"],
    [/iPad/i, "iPadOS"],
    [/Mac OS X/i, "macOS"],
    [/CrOS/i, "ChromeOS"],
    [/Linux/i, "Linux"],
  ];

  return (
    operatingSystemMatchers.find(([pattern]) => pattern.test(userAgent))?.[1] ??
    "Unknown OS"
  );
}

function parseDeviceType(userAgent: string) {
  if (/iPad|Tablet/i.test(userAgent)) return "Tablet";
  if (/Mobile|iPhone|Android/i.test(userAgent)) return "Mobile";
  return "Desktop";
}

function buildDeviceLabel(browser: string, operatingSystem: string) {
  return `${browser} on ${operatingSystem}`;
}

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

async function hashString(value: string) {
  if (!window.crypto?.subtle) {
    return Array.from(value)
      .map((character) => character.charCodeAt(0).toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 128);
  }

  const encodedValue = new TextEncoder().encode(value);
  const digest = await window.crypto.subtle.digest("SHA-256", encodedValue);
  return toHex(digest);
}

function getCanvasFingerprint() {
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return "canvas-unavailable";

    context.textBaseline = "top";
    context.font = "14px Arial";
    context.fillStyle = "#1b4d89";
    context.fillRect(2, 2, 80, 20);
    context.fillStyle = "#f5f5f5";
    context.fillText("WaterManagerDB", 4, 4);
    context.strokeStyle = "#ff7a59";
    context.arc(60, 30, 20, 0, Math.PI * 2);
    context.stroke();

    return canvas.toDataURL();
  } catch {
    return "canvas-error";
  }
}

function getWebGLFingerprint() {
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl");

    if (!gl || !(gl instanceof WebGLRenderingContext)) {
      return {
        vendor: "webgl-unavailable",
        renderer: "webgl-unavailable",
      };
    }

    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    return {
      vendor: debugInfo
        ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)
        : "vendor-unavailable",
      renderer: debugInfo
        ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
        : "renderer-unavailable",
    };
  } catch {
    return {
      vendor: "webgl-error",
      renderer: "webgl-error",
    };
  }
}

async function computeFingerprintHash() {
  const webglFingerprint = getWebGLFingerprint();
  const navigatorWithDeviceMemory = navigator as Navigator & {
    deviceMemory?: number;
  };

  const fingerprintPayload = {
    userAgent: navigator.userAgent,
    language: navigator.language,
    languages: navigator.languages,
    platform: navigator.platform,
    vendor: navigator.vendor,
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemory: navigatorWithDeviceMemory.deviceMemory ?? null,
    maxTouchPoints: navigator.maxTouchPoints,
    cookieEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack,
    webdriver: navigator.webdriver,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffset: new Date().getTimezoneOffset(),
    screen: {
      width: window.screen.width,
      height: window.screen.height,
      availWidth: window.screen.availWidth,
      availHeight: window.screen.availHeight,
      colorDepth: window.screen.colorDepth,
      pixelDepth: window.screen.pixelDepth,
    },
    colorSchemeDark: window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? null,
    reducedMotion: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? null,
    localStorage: typeof window.localStorage !== "undefined",
    sessionStorage: typeof window.sessionStorage !== "undefined",
    indexedDb: typeof window.indexedDB !== "undefined",
    plugins: Array.from(navigator.plugins ?? []).map((plugin) => plugin.name),
    mimeTypes: Array.from(navigator.mimeTypes ?? []).map((mimeType) => mimeType.type),
    canvas: getCanvasFingerprint(),
    webgl: webglFingerprint,
  };

  return hashString(JSON.stringify(fingerprintPayload));
}

export async function collectSessionTrackingMetadata(): Promise<SessionTrackingMetadata> {
  if (sessionTrackingMetadataPromise) {
    return sessionTrackingMetadataPromise;
  }

  sessionTrackingMetadataPromise = (async () => {
    try {
      const browser = parseBrowser(navigator.userAgent);
      const operatingSystem = parseOperatingSystem(navigator.userAgent);
      const deviceType = parseDeviceType(navigator.userAgent);
      const deviceLabel = buildDeviceLabel(browser, operatingSystem);
      const fingerprintHash = await computeFingerprintHash();

      return {
        browser,
        operatingSystem,
        deviceType,
        deviceLabel,
        fingerprintHash,
      };
    } catch {
      return {
        browser: "Unknown Browser",
        operatingSystem: "Unknown OS",
        deviceType: "Unknown Device",
        deviceLabel: "Unknown Browser on Unknown OS",
        fingerprintHash: "fingerprint-unavailable",
      };
    }
  })();

  return sessionTrackingMetadataPromise;
}

export function buildSessionTrackingHeaders(metadata: SessionTrackingMetadata) {
  return {
    "X-Device-Fingerprint": metadata.fingerprintHash,
    "X-Browser": metadata.browser,
    "X-Operating-System": metadata.operatingSystem,
    "X-Device-Type": metadata.deviceType,
    "X-Device-Label": metadata.deviceLabel,
  };
}

export function persistTrackedSession(
  sessionIdentifier: string,
  fingerprintHash: string,
) {
  window.localStorage.setItem(SESSION_IDENTIFIER_STORAGE_KEY, sessionIdentifier);
  window.localStorage.setItem(SESSION_FINGERPRINT_STORAGE_KEY, fingerprintHash);
}

export function clearTrackedSession() {
  window.localStorage.removeItem(SESSION_IDENTIFIER_STORAGE_KEY);
  window.localStorage.removeItem(SESSION_FINGERPRINT_STORAGE_KEY);
}

export function getTrackedSession() {
  const sessionIdentifier = window.localStorage.getItem(
    SESSION_IDENTIFIER_STORAGE_KEY,
  );
  const fingerprintHash = window.localStorage.getItem(
    SESSION_FINGERPRINT_STORAGE_KEY,
  );

  if (!sessionIdentifier) return null;

  return {
    sessionIdentifier,
    fingerprintHash,
  };
}

export async function notifyTrackedLogout(reasonName: string) {
  const trackedSession = getTrackedSession();
  const authToken = window.localStorage.getItem("_auth");

  try {
    if (reasonName !== "session_expired" && authToken) {
      await fetch(`${API_URL}/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sign_out_reason_name: reasonName,
          fingerprint_hash: trackedSession?.fingerprintHash ?? null,
        }),
      });
      return;
    }

    if (trackedSession) {
      await fetch(`${API_URL}/logout/expired`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_identifier: trackedSession.sessionIdentifier,
          sign_out_reason_name: reasonName,
          fingerprint_hash: trackedSession.fingerprintHash ?? null,
        }),
      });
    }
  } catch {
    // Best effort only. Local sign-out should continue even if audit logging fails.
  }
}
