import { describe, expect, it } from "vitest";
import { Writable } from "node:stream";
import { DiagnosticLeases, createLogger } from "./index.js";

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

describe("Pino secret redaction", () => {
  it("redacts top-level and nested secrets, and drops raw request body/headers/query", () => {
    const chunks: string[] = [];
    const sink = new Writable({ write(chunk, _encoding, next) { chunks.push(String(chunk)); next(); } });
    const logger = createLogger("adapter", "info", sink);
    logger.info({
      password: "password-canary", passwordMD5: "md5-canary", token: "token-canary",
      nested: { password: "nested-canary" },
      req: { id:"safe-request", method:"GET", url:"/health?token=query-canary",
        headers: { authorization:"auth-canary", "x-auth-key":"ko-canary" }, body:"body-canary" }
    }, "redaction canary");
    const output = chunks.join("");
    expect(output).toContain("[REDACTED]");
    for (const secret of ["password-canary","md5-canary","token-canary","nested-canary","query-canary","auth-canary","ko-canary","body-canary"]) {
      expect(output).not.toContain(secret);
    }
  });
});
