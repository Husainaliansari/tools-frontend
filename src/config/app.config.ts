const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1'])

/**
 * Resolve the base URL the browser should use for API calls.
 *
 * When `VITE_API_BASE_URL` is a loopback address (the dev default,
 * `http://localhost:8000`) it is only reachable from the machine running the
 * servers — a browser opening the app over a LAN IP cannot reach it, and
 * rewriting the host to that same LAN IP fails too unless the backend also
 * binds `0.0.0.0`. Instead we talk to the app's OWN origin and let the Vite
 * dev proxy forward `/api` to the backend (the Vite process itself can always
 * reach the loopback backend). This works identically on `localhost` and over
 * a LAN IP, and needs no cross-origin CORS grant.
 *
 * A non-loopback `VITE_API_BASE_URL` (a real API host in staging/production)
 * is always used verbatim.
 */
const getApiBaseUrl = (): string => {
  const rawUrl = import.meta.env.VITE_API_BASE_URL as string
  try {
    const url = new URL(rawUrl)
    if (LOOPBACK_HOSTS.has(url.hostname) && typeof window !== 'undefined') {
      // Same-origin: axios/EventSource resolve relative paths against the page.
      return ''
    }
  } catch {
    // Not an absolute URL — fall through and use it as-is (already relative).
  }
  return rawUrl
}

/**
 * WebSocket origin for live job progress. A WebSocket URL must be absolute, so
 * when the API is same-origin we derive it from the page origin; otherwise we
 * convert the configured http(s) base to ws(s).
 */
const getWsBaseUrl = (base: string): string => {
  if (base) return base.replace(/^http/, 'ws')
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/^http/, 'ws')
  }
  return ''
}

/**
 * Application-level environment configuration.
 * All VITE_ prefixed env vars are validated and typed here.
 */
export const appConfig = {
  /** Base URL of the API (empty string = same-origin, via the dev proxy). */
  apiBaseUrl: getApiBaseUrl(),

  /** Absolute ws(s) origin for live job-progress sockets. */
  wsBaseUrl: getWsBaseUrl(getApiBaseUrl()),

  /** Global Axios request timeout in milliseconds */
  apiTimeout: Number(import.meta.env.VITE_API_TIMEOUT ?? 30000),

  /** Human-readable app name */
  appName: import.meta.env.VITE_APP_NAME as string,

  /** Public URL of the frontend */
  appUrl: import.meta.env.VITE_APP_URL as string,

  /** Current environment: development | staging | production */
  appEnv: import.meta.env.VITE_APP_ENV as 'development' | 'staging' | 'production',

  /** Whether this is a production build */
  isProduction: import.meta.env.PROD,

  /** Whether dark mode is enabled globally */
  enableDarkMode: import.meta.env.VITE_ENABLE_DARK_MODE === 'true',

  /** Whether analytics should be active */
  enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',

  /** Maximum file upload size in megabytes */
  maxUploadSizeMB: Number(import.meta.env.VITE_MAX_UPLOAD_SIZE_MB ?? 50),
} as const

export type AppConfig = typeof appConfig
