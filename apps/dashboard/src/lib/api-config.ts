/**
 * Resolves the API's HTTP and WebSocket base URLs from Vite env vars.
 */

const API_BASE_URL: string = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

export function getWsUrl(path: string): string {
  const wsBase = API_BASE_URL.replace(/^http/, "ws");
  return new URL(path, wsBase).toString();
}
