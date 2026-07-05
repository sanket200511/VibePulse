/**
 * Global Vitest setup — extends `expect` with jest-dom matchers and unmounts
 * rendered components between tests (globals: false means RTL's automatic
 * afterEach cleanup never registers on its own).
 */

import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

afterEach(() => {
  cleanup();
});
