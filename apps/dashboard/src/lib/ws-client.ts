/**
 * Reconnecting WebSocket client.
 *
 * Reconnects with exponential backoff on close/error so a dropped
 * connection (API restart, network blip) recovers without a page refresh.
 */

export type WsStatus = "connecting" | "open" | "closed";

export interface WsClientOptions {
  url: string;
  onMessage: (data: unknown) => void;
  onStatusChange?: (status: WsStatus) => void;
}

export interface WsClient {
  close: () => void;
}

const BASE_DELAY_MS = 500;
const MAX_DELAY_MS = 10_000;

export function connectWs({ url, onMessage, onStatusChange }: WsClientOptions): WsClient {
  let socket: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let closedByCaller = false;
  let attempt = 0;

  const scheduleReconnect = (): void => {
    if (closedByCaller) return;
    const delay = Math.min(BASE_DELAY_MS * 2 ** attempt, MAX_DELAY_MS);
    attempt += 1;
    reconnectTimer = setTimeout(connect, delay);
  };

  function connect(): void {
    onStatusChange?.("connecting");
    socket = new WebSocket(url);

    socket.addEventListener("open", () => {
      attempt = 0;
      onStatusChange?.("open");
    });

    socket.addEventListener("message", (event: MessageEvent<string>) => {
      try {
        onMessage(JSON.parse(event.data) as unknown);
      } catch {
        // Malformed frame — ignore rather than crash the feed.
      }
    });

    socket.addEventListener("close", () => {
      onStatusChange?.("closed");
      scheduleReconnect();
    });

    socket.addEventListener("error", () => {
      socket?.close();
    });
  }

  connect();

  return {
    close(): void {
      closedByCaller = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close();
    },
  };
}
