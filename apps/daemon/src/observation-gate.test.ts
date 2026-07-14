import { describe, expect, it } from "vitest";
import { createObservationGate } from "./observation-gate";

describe("createObservationGate", () => {
  describe("initial state", () => {
    it("starts closed", () => {
      const gate = createObservationGate();
      expect(gate.isOpen()).toBe(false);
    });
  });

  describe("open()", () => {
    it("opens the gate", () => {
      const gate = createObservationGate();
      gate.open();
      expect(gate.isOpen()).toBe(true);
    });

    it("is idempotent — calling open() twice remains open", () => {
      const gate = createObservationGate();
      gate.open();
      gate.open();
      expect(gate.isOpen()).toBe(true);
    });
  });

  describe("close()", () => {
    it("closes an open gate", () => {
      const gate = createObservationGate();
      gate.open();
      gate.close();
      expect(gate.isOpen()).toBe(false);
    });

    it("is idempotent — calling close() on a closed gate remains closed", () => {
      const gate = createObservationGate();
      gate.close();
      gate.close();
      expect(gate.isOpen()).toBe(false);
    });
  });

  describe("state transitions", () => {
    it("can be cycled open → closed → open", () => {
      const gate = createObservationGate();
      gate.open();
      expect(gate.isOpen()).toBe(true);
      gate.close();
      expect(gate.isOpen()).toBe(false);
      gate.open();
      expect(gate.isOpen()).toBe(true);
    });

    it("two gate instances are independent", () => {
      const gate1 = createObservationGate();
      const gate2 = createObservationGate();
      gate1.open();
      expect(gate1.isOpen()).toBe(true);
      expect(gate2.isOpen()).toBe(false);
    });
  });
});
