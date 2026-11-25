const RELOAD_GUARD_KEY = "cb_reloaded_build_id";
const VERSION_QUERY_PARAM = "_v";
const CHECK_COOLDOWN_MS = 15_000;
const AUTO_POLL_INTERVAL_MS = 5 * 60_000;

interface BuildVersionPayload {
  buildId?: string;
}

let lastCheckedAt = 0;
let inFlightCheck: Promise<boolean> | null = null;
let listenersAttached = false;

/** Deletes browser Cache Storage buckets and unregisters service workers without clearing auth storage. */
export async function clearBrowserCaches(): Promise<void> {
  if ("caches" in window) {
    try {
      const cacheKeys = await window.caches.keys();
      await Promise.all(cacheKeys.map((key) => window.caches.delete(key)));
    } catch {
      // Cache Storage may be blocked in restricted browser contexts.
    }
  }

  if ("serviceWorker" in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((reg) => reg.unregister()));
    } catch {
      // Service worker access is unavailable on insecure origins.
    }
  }
}

/** Removes internal cache-busting query parameter once the fresh bundle has booted. */
export function stripVersionQueryParam(): void {
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has(VERSION_QUERY_PARAM)) return;
    url.searchParams.delete(VERSION_QUERY_PARAM);
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  } catch {
    // Ignore malformed URL edge cases.
  }
}

/** Checks server version.json; when mismatched, clears web cache and hard-reloads latest build. */
export async function checkAndReloadIfStale(force = false): Promise<boolean> {
  if (import.meta.env.DEV) return false;

  const now = Date.now();
  if (!force && now - lastCheckedAt < CHECK_COOLDOWN_MS) {
    return false;
  }
  if (inFlightCheck) {
    return inFlightCheck;
  }

  lastCheckedAt = now;
  inFlightCheck = (async () => {
    try {
      const baseUrl = import.meta.env.BASE_URL || "/";
      const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
      const res = await fetch(`${normalizedBase}version.json?_ts=${Date.now()}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
      });
      if (!res.ok) return false;

      const data = (await res.json()) as BuildVersionPayload;
      const serverBuildId = data?.buildId?.trim();
      if (!serverBuildId || serverBuildId === __APP_BUILD_ID__) {
        return false;
      }

      // Guard against infinite reload loops if an upstream proxy forcefully serves stale HTML.
      if (sessionStorage.getItem(RELOAD_GUARD_KEY) === serverBuildId) {
        return false;
      }
      sessionStorage.setItem(RELOAD_GUARD_KEY, serverBuildId);

      await clearBrowserCaches();

      const reloadUrl = new URL(window.location.href);
      reloadUrl.searchParams.set(VERSION_QUERY_PARAM, serverBuildId);
      window.location.replace(reloadUrl.toString());
      return true;
    } catch {
      return false;
    } finally {
      inFlightCheck = null;
    }
  })();

  return inFlightCheck;
}

/** Registers visibility, focus, and periodic background checks so open tabs also auto-refresh on deploy. */
export function setupAutoCacheRefreshListeners(): void {
  if (import.meta.env.DEV || listenersAttached) return;
  listenersAttached = true;

  const triggerCheck = () => {
    void checkAndReloadIfStale(false);
  };

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      triggerCheck();
    }
  });
  window.addEventListener("focus", triggerCheck);
  window.setInterval(triggerCheck, AUTO_POLL_INTERVAL_MS);
}

/** Runs initial pre-render cache verification bounded by a short timeout so slow networks never stall boot. */
export async function initAutoCacheRefresh(maxWaitMs = 1000): Promise<boolean> {
  stripVersionQueryParam();
  setupAutoCacheRefreshListeners();

  if (import.meta.env.DEV) return false;

  const timeout = new Promise<boolean>((resolve) => {
    window.setTimeout(() => resolve(false), maxWaitMs);
  });

  return Promise.race([checkAndReloadIfStale(true), timeout]);
}
