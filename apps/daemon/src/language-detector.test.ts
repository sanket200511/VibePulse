import { describe, expect, it } from "vitest";
import { detectLanguage } from "./language-detector";

describe("detectLanguage", () => {
  it("maps known extensions to their language", () => {
    expect(detectLanguage(".ts")).toBe("TypeScript");
    expect(detectLanguage(".py")).toBe("Python");
    expect(detectLanguage(".rs")).toBe("Rust");
  });

  it("is case-insensitive", () => {
    expect(detectLanguage(".TS")).toBe("TypeScript");
  });

  it("returns undefined for unknown extensions", () => {
    expect(detectLanguage(".xyz")).toBeUndefined();
  });

  it("returns undefined when no extension is given", () => {
    expect(detectLanguage(undefined)).toBeUndefined();
  });
});
