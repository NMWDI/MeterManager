const MAP_CACHE_PREFIX = "wmdb:map-cache:";
export const MAP_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 2;

type StoredMapCache<T> = {
  data: T;
  updatedAt: number;
};

function getMapCacheStorageKey(queryKey: readonly unknown[]) {
  return `${MAP_CACHE_PREFIX}${JSON.stringify(queryKey)}`;
}

export function readMapCache<T>(queryKey: readonly unknown[]) {
  if (typeof window === "undefined") return undefined;

  const storageKey = getMapCacheStorageKey(queryKey);
  const rawValue = window.localStorage.getItem(storageKey);
  if (!rawValue) return undefined;

  try {
    const parsed = JSON.parse(rawValue) as StoredMapCache<T>;
    if (
      !parsed ||
      typeof parsed.updatedAt !== "number" ||
      Date.now() - parsed.updatedAt > MAP_CACHE_TTL_MS
    ) {
      window.localStorage.removeItem(storageKey);
      return undefined;
    }

    return parsed;
  } catch {
    window.localStorage.removeItem(storageKey);
    return undefined;
  }
}

export function writeMapCache<T>(queryKey: readonly unknown[], data: T) {
  if (typeof window === "undefined") return;

  const storageKey = getMapCacheStorageKey(queryKey);
  const value: StoredMapCache<T> = {
    data,
    updatedAt: Date.now(),
  };

  window.localStorage.setItem(storageKey, JSON.stringify(value));
}

export function clearSavedQueryLocalStorage() {
  if (typeof window === "undefined") return;

  const keysToRemove: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key?.startsWith(MAP_CACHE_PREFIX)) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => window.localStorage.removeItem(key));
}
