import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHttpPublisher, type PublisherConfig } from "./http-publisher";
import { EventType, CURRENT_SCHEMA_VERSION, type DevelopmentEvent } from "../event-types";

const BASE_CONFIG: PublisherConfig = {
  retryMaxNormal: 3,
  retryMaxCritical: 5,
  retryBackoffBaseMs: 0, // 0 ms backoff so tests don't wait
};

const NORMAL_EVENT: DevelopmentEvent = {
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
  daemon_seq: 0,
};

const CRITICAL_EVENT: DevelopmentEvent = {
  schema_version: CURRENT_SCHEMA_VERSION,
  event_type: EventType.OBSERVATION_STARTED,
  timestamp: "2026-07-03T00:00:00.000Z",
  session_id: "session-1",
  project_root: "/repo",
  file_path: undefined,
  file_name: undefined,
  metadata: {},
  daemon_seq: 0,
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

  describe("NORMAL publish()", () => {
    it("POSTs the event to <apiUrl>/events", async () => {
      fetchMock.mockResolvedValueOnce(new Response(null, { status: 201 }));
      const publisher = createHttpPublisher("http://localhost:5184", BASE_CONFIG);

      await publisher.publish(NORMAL_EVENT);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:5184/events");
      expect(init.method).toBe("POST");
      expect(JSON.parse(init.body as string)).toMatchObject({ file_path: "/repo/main.py" });
    });

    it("does not retry on a 4xx client error", async () => {
      fetchMock.mockResolvedValueOnce(new Response(null, { status: 422 }));
      const publisher = createHttpPublisher("http://localhost:5184", BASE_CONFIG);

      await publisher.publish(NORMAL_EVENT);

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("retries on server errors and eventually succeeds", async () => {
      fetchMock
        .mockResolvedValueOnce(new Response(null, { status: 503 }))
        .mockResolvedValueOnce(new Response(null, { status: 201 }));
      const publisher = createHttpPublisher("http://localhost:5184", BASE_CONFIG);

      await publisher.publish(NORMAL_EVENT);

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("gives up after retryMaxNormal attempts when the API is unavailable", async () => {
      fetchMock.mockRejectedValue(new Error("connect ECONNREFUSED"));
      const publisher = createHttpPublisher("http://localhost:5184", BASE_CONFIG);

      await expect(publisher.publish(NORMAL_EVENT)).resolves.toBeUndefined();

      expect(fetchMock).toHaveBeenCalledTimes(BASE_CONFIG.retryMaxNormal);
    });

    it("respects a custom retryMaxNormal from config", async () => {
      fetchMock.mockRejectedValue(new Error("unavailable"));
      const config: PublisherConfig = { ...BASE_CONFIG, retryMaxNormal: 2 };
      const publisher = createHttpPublisher("http://localhost:5184", config);

      await publisher.publish(NORMAL_EVENT);

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe("CRITICAL publishCritical()", () => {
    it("POSTs critical events to the same /events endpoint", async () => {
      fetchMock.mockResolvedValueOnce(new Response(null, { status: 201 }));
      const publisher = createHttpPublisher("http://localhost:5184", BASE_CONFIG);

      await publisher.publishCritical(CRITICAL_EVENT);

      const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:5184/events");
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("stops immediately on success", async () => {
      fetchMock.mockResolvedValueOnce(new Response(null, { status: 201 }));
      const publisher = createHttpPublisher("http://localhost:5184", BASE_CONFIG);

      await publisher.publishCritical(CRITICAL_EVENT);

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("does not retry CRITICAL events on 4xx", async () => {
      fetchMock.mockResolvedValueOnce(new Response(null, { status: 422 }));
      const publisher = createHttpPublisher("http://localhost:5184", BASE_CONFIG);

      await publisher.publishCritical(CRITICAL_EVENT);

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("retries up to retryMaxCritical times (more than NORMAL)", async () => {
      fetchMock.mockRejectedValue(new Error("unavailable"));
      const publisher = createHttpPublisher("http://localhost:5184", BASE_CONFIG);

      await publisher.publishCritical(CRITICAL_EVENT);

      // BASE_CONFIG.retryMaxCritical = 5, retryMaxNormal = 3
      expect(fetchMock).toHaveBeenCalledTimes(BASE_CONFIG.retryMaxCritical);
    });

    it("CRITICAL uses retryMaxCritical independently of retryMaxNormal", async () => {
      fetchMock.mockRejectedValue(new Error("unavailable"));
      const config: PublisherConfig = {
        retryMaxNormal: 2,
        retryMaxCritical: 7,
        retryBackoffBaseMs: 0,
      };
      const publisher = createHttpPublisher("http://localhost:5184", config);

      await publisher.publishCritical(CRITICAL_EVENT);

      expect(fetchMock).toHaveBeenCalledTimes(7);
    });

    it("recovers if API becomes available mid-retry", async () => {
      fetchMock
        .mockRejectedValueOnce(new Error("unavailable"))
        .mockRejectedValueOnce(new Error("unavailable"))
        .mockResolvedValueOnce(new Response(null, { status: 201 }));
      const publisher = createHttpPublisher("http://localhost:5184", BASE_CONFIG);

      await publisher.publishCritical(CRITICAL_EVENT);

      expect(fetchMock).toHaveBeenCalledTimes(3);
    });
  });
});
