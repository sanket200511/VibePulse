import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { checkApiHealth, ensureProject, ensureProjectWithRetry } from "./project-registrar";

describe("project-registrar", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("checkApiHealth", () => {
    it("returns true when health endpoint returns 200 OK", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      } as Response);

      const healthy = await checkApiHealth("http://localhost:5133");
      expect(healthy).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith("http://localhost:5133/health", expect.any(Object));
    });

    it("returns false when health endpoint fails or times out", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Connection refused"));

      const healthy = await checkApiHealth("http://localhost:5133");
      expect(healthy).toBe(false);
    });
  });

  describe("ensureProject", () => {
    it("successfully registers or ensures a project with API", async () => {
      const mockProject = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        display_name: "OneStopAnalytics_Main",
        root_path: "C:\\Users\\ASUS\\OneDrive\\Desktop\\OneStopAnalytics_Main",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockProject,
      } as Response);

      const result = await ensureProject(
        "http://localhost:5133",
        "C:\\Users\\ASUS\\OneDrive\\Desktop\\OneStopAnalytics_Main",
      );

      expect(result.id).toBe(mockProject.id);
      expect(result.display_name).toBe("OneStopAnalytics_Main");
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:5133/api/projects",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            root_path: "C:\\Users\\ASUS\\OneDrive\\Desktop\\OneStopAnalytics_Main",
            display_name: "OneStopAnalytics_Main",
          }),
        }),
      );
    });

    it("throws error when API returns error status", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => "Internal server error",
      } as Response);

      await expect(ensureProject("http://localhost:5133", "/fake/root")).rejects.toThrow(
        "API returned HTTP 500",
      );
    });
  });

  describe("ensureProjectWithRetry", () => {
    it("retries when API is initially offline and succeeds once reachable", async () => {
      const mockProject = {
        id: "proj-retry",
        display_name: "RetryProject",
        root_path: "/repo/retry",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // 1st call to /health fails, 2nd call to /health succeeds, 3rd call to /api/projects succeeds
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        callCount++;
        if (url.includes("/health")) {
          if (callCount === 1) {
            throw new Error("ECONNREFUSED");
          }
          return { ok: true, status: 200 } as Response;
        }
        if (url.includes("/api/projects")) {
          return {
            ok: true,
            status: 200,
            json: async () => mockProject,
          } as Response;
        }
        return { ok: false, status: 404 } as Response;
      });

      const res = await ensureProjectWithRetry(
        "http://localhost:5133",
        "/repo/retry",
        "RetryProject",
        { maxAttempts: 3, initialDelayMs: 10, maxDelayMs: 20 },
      );

      expect(res.id).toBe("proj-retry");
      expect(callCount).toBeGreaterThanOrEqual(3);
    });

    it("throws after exhausting maxAttempts", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));

      await expect(
        ensureProjectWithRetry("http://localhost:5133", "/repo/retry", undefined, {
          maxAttempts: 2,
          initialDelayMs: 10,
          maxDelayMs: 20,
        }),
      ).rejects.toThrow();
    });
  });
});
