import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadConfig } from "./config";

describe("loadConfig", () => {
  const ENV_VARS = [
    "DEBOUNCE_MS",
    "QUEUE_MAX_SIZE",
    "RETRY_MAX_CRITICAL",
    "RETRY_MAX_NORMAL",
    "RETRY_BACKOFF_BASE_MS",
  ] as const;

  beforeEach(() => {
    ENV_VARS.forEach((key) => delete process.env[key]);
  });

  afterEach(() => {
    ENV_VARS.forEach((key) => delete process.env[key]);
  });

  describe("defaults", () => {
    it("returns the correct default for debounceMs", () => {
      expect(loadConfig().debounceMs).toBe(300);
    });

    it("returns the correct default for queueMaxSize", () => {
      expect(loadConfig().queueMaxSize).toBe(500);
    });

    it("returns the correct default for retryMaxCritical", () => {
      expect(loadConfig().retryMaxCritical).toBe(10);
    });

    it("returns the correct default for retryMaxNormal", () => {
      expect(loadConfig().retryMaxNormal).toBe(3);
    });

    it("returns the correct default for retryBackoffBaseMs", () => {
      expect(loadConfig().retryBackoffBaseMs).toBe(200);
    });
  });

  describe("env var parsing", () => {
    it("reads DEBOUNCE_MS from the environment", () => {
      process.env["DEBOUNCE_MS"] = "500";
      expect(loadConfig().debounceMs).toBe(500);
    });

    it("reads QUEUE_MAX_SIZE from the environment", () => {
      process.env["QUEUE_MAX_SIZE"] = "1000";
      expect(loadConfig().queueMaxSize).toBe(1000);
    });

    it("reads RETRY_MAX_CRITICAL from the environment", () => {
      process.env["RETRY_MAX_CRITICAL"] = "5";
      expect(loadConfig().retryMaxCritical).toBe(5);
    });

    it("reads RETRY_MAX_NORMAL from the environment", () => {
      process.env["RETRY_MAX_NORMAL"] = "7";
      expect(loadConfig().retryMaxNormal).toBe(7);
    });

    it("reads RETRY_BACKOFF_BASE_MS from the environment", () => {
      process.env["RETRY_BACKOFF_BASE_MS"] = "100";
      expect(loadConfig().retryBackoffBaseMs).toBe(100);
    });
  });

  describe("validation", () => {
    it("throws RangeError when DEBOUNCE_MS is zero", () => {
      process.env["DEBOUNCE_MS"] = "0";
      expect(() => loadConfig()).toThrow(RangeError);
    });

    it("throws RangeError when QUEUE_MAX_SIZE is negative", () => {
      process.env["QUEUE_MAX_SIZE"] = "-1";
      expect(() => loadConfig()).toThrow(RangeError);
    });

    it("throws RangeError when RETRY_MAX_CRITICAL is not an integer", () => {
      process.env["RETRY_MAX_CRITICAL"] = "1.5";
      expect(() => loadConfig()).toThrow(RangeError);
    });

    it("throws RangeError when a variable is non-numeric", () => {
      process.env["DEBOUNCE_MS"] = "fast";
      expect(() => loadConfig()).toThrow(RangeError);
    });

    it("uses the default when a variable is an empty string", () => {
      process.env["DEBOUNCE_MS"] = "";
      expect(loadConfig().debounceMs).toBe(300);
    });
  });
});
