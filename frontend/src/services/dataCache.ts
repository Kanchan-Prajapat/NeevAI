type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const DEFAULT_TTL_MS = 30_000;

const store = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

export const CACHE_KEYS = {
  projects: "projects",
  snapshots: "snapshots",
  dashboardAnalytics: "dashboardAnalytics",
} as const;

export const cachedFetch = async <T>(
  key: string,
  loader: () => Promise<T>,
  options?: {
    ttlMs?: number;
    force?: boolean;
  }
): Promise<T> => {
  const ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;

  if (options?.force) {
    store.delete(key);
  } else {
    const existing = store.get(key) as CacheEntry<T> | undefined;

    if (existing && existing.expiresAt > Date.now()) {
      return existing.value;
    }
  }

  const pending = inflight.get(key);

  if (pending) {
    return pending as Promise<T>;
  }

  const request = loader()
    .then((value) => {
      store.set(key, {
        value,
        expiresAt: Date.now() + ttlMs,
      });
      inflight.delete(key);
      return value;
    })
    .catch((error) => {
      inflight.delete(key);
      throw error;
    });

  inflight.set(key, request);
  return request;
};

export const invalidatePortfolioCache = (): void => {
  store.delete(CACHE_KEYS.projects);
  store.delete(CACHE_KEYS.snapshots);
  store.delete(CACHE_KEYS.dashboardAnalytics);
  inflight.delete(CACHE_KEYS.projects);
  inflight.delete(CACHE_KEYS.snapshots);
  inflight.delete(CACHE_KEYS.dashboardAnalytics);
};
