/**
 * Resolves the API's HTTP and WebSocket base URLs from Vite env vars.
 *
 * In development (no VITE_API_URL set), we return the current window origin so
 * that all fetch() calls resolve to the same origin and are routed through the
 * Vite dev-server proxy to the backend — eliminating any CORS issues.
 *
 * In staging/production (VITE_API_URL set), we call the backend directly.
 */

const EXPLICIT_API_URL: string | undefined = import.meta.env.VITE_API_URL as string | undefined;

export function getApiBaseUrl(): string {
  if (EXPLICIT_API_URL) return EXPLICIT_API_URL;
  // In the browser, use the current origin so requests go through the Vite proxy.
  if (typeof window !== "undefined") return window.location.origin;
  // Fallback for SSR / tests
  return "http://localhost:5133";
}

export function getWsUrl(path: string): string {
  if (EXPLICIT_API_URL) {
    const wsBase = EXPLICIT_API_URL.replace(/^http/, "ws");
    return new URL(path, wsBase).toString();
  }
  // In dev, derive ws:// from the current window location (proxied by Vite)
  const wsBase =
    typeof window !== "undefined"
      ? `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}`
      : "ws://localhost:5134";
  return new URL(path, wsBase).toString();
}
