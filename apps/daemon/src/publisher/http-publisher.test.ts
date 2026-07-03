import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHttpPublisher } from "./http-publisher";
import { EventType, CURRENT_SCHEMA_VERSION, type DevelopmentEvent } from "../event-types";

const EVENT: DevelopmentEvent = {
  schema_version: CURRENT_SCHEMA_VERSION,
  event_type: EventType.FILE_MODIFIED,
  timestamp: "2026-07-03T00:00:00.000Z",
  session_id: "session-1",
  project_root: "/repo",
  file_path: "/repo/main.py",
  file_name: "main.py",
  file_extension: ".py",
  language: "Python",
  metadata: {},
};

describe("createHttpPublisher", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POSTs the event to <apiUrl>/events", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 201 }));
    const publisher = createHttpPublisher("http://localhost:8000");

    await publisher.publish(EVENT);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:8000/events");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toMatchObject({ file_path: "/repo/main.py" });
  });

  it("does not retry on a 4xx client error", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 422 }));
    const publisher = createHttpPublisher("http://localhost:8000");

    await publisher.publish(EVENT);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries on server errors and eventually succeeds", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response(null, { status: 201 }));
    const publisher = createHttpPublisher("http://localhost:8000");

    await publisher.publish(EVENT);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("gives up after exhausting retries when the API is unavailable", async () => {
    fetchMock.mockRejectedValue(new Error("connect ECONNREFUSED"));
    const publisher = createHttpPublisher("http://localhost:8000");

    await expect(publisher.publish(EVENT)).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
