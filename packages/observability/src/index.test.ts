import { describe, expect, it } from "vitest";
import { DiagnosticLeases } from "./index.js";

describe("diagnostic leases", () => {
  it("requires administrator authorization", () => {
    const leases = new DiagnosticLeases();
    expect(() => leases.enable({ module:"adapter", level:"trace", durationMs: 1000, adminAuthorized:false },0)).toThrow();
  });
  it("enforces trace maximum and auto expiry", () => {
    const leases = new DiagnosticLeases();
    expect(() => leases.enable({ module:"adapter", level:"trace", durationMs: 300001, adminAuthorized:true },0)).toThrow();
    leases.enable({ module:"adapter", level:"trace", durationMs: 300000, adminAuthorized:true },1000);
    expect(leases.levelFor("adapter",1001)).toBe("trace");
    expect(leases.levelFor("adapter",301000)).toBe("info");
  });
  it("does not persist leases across instances", () => {
    const leases = new DiagnosticLeases();
    leases.enable({ module:"adapter", level:"debug", durationMs: 1000, adminAuthorized:true },0);
    expect(new DiagnosticLeases().levelFor("adapter",1)).toBe("info");
  });
});
