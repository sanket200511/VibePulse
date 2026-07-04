/**
 * Minimal in-memory stand-in for the browser `WebSocket` used by ws-client
 * tests. Real WebSockets require a server; this fake lets tests drive the
 * exact events (`open`, `message`, `close`, `error`) `connectWs` listens for
 * without mocking the module under test itself.
 */

type Listener = (event: unknown) => void;

export class FakeWebSocket {
  static instances: FakeWebSocket[] = [];

  readonly url: string;
  private listeners = new Map<string, Set<Listener>>();
  closed = false;

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  static reset(): void {
    FakeWebSocket.instances = [];
  }

  static latest(): FakeWebSocket {
    const instance = FakeWebSocket.instances.at(-1);
    if (!instance) throw new Error("No FakeWebSocket has been constructed yet");
    return instance;
  }

  addEventListener(type: string, listener: Listener): void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(listener);
  }

  close(): void {
    this.closed = true;
    this.emit("close", {});
  }

  emitOpen(): void {
    this.emit("open", {});
  }

  emitMessage(data: string): void {
    this.emit("message", { data });
  }

  emitError(): void {
    this.emit("error", {});
  }

  private emit(type: string, event: unknown): void {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }
}
