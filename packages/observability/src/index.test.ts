import { describe, expect, it } from "vitest";
import { Writable } from "node:stream";
import { DiagnosticLeases, SafeLogBuffer, createLogger, createScopedDiagnostics } from "./index.js";

describe("diagnostic leases", () => {
  it("requires administrator authorization", () => {
    const leases = new DiagnosticLeases();
    expect(() =>
      leases.enable(
        { module: "adapter", level: "trace", durationMs: 1000, adminAuthorized: false },
        0,
      ),
    ).toThrow();
  });
  it("enforces trace maximum and auto expiry", () => {
    const leases = new DiagnosticLeases();
    expect(() =>
      leases.enable(
        { module: "adapter", level: "trace", durationMs: 300001, adminAuthorized: true },
        0,
      ),
    ).toThrow();
    leases.enable(
      { module: "adapter", level: "trace", durationMs: 300000, adminAuthorized: true },
      1000,
    );
    expect(leases.levelFor("adapter", 1001)).toBe("trace");
    expect(leases.levelFor("adapter", 301000)).toBe("info");
  });
  it("rejects forged levels, invalid time and non-integer durations at runtime", () => {
    const leases = new DiagnosticLeases();
    expect(() =>
      leases.enable(
        { module: "adapter", level: "fatal" as never, durationMs: 1000, adminAuthorized: true },
        1000,
      ),
    ).toThrow("Invalid diagnostic level");
    expect(() =>
      leases.enable(
        { module: "adapter", level: "debug", durationMs: 1.5, adminAuthorized: true },
        1000,
      ),
    ).toThrow();
    expect(() =>
      leases.enable(
        { module: "adapter", level: "debug", durationMs: 1000, adminAuthorized: true },
        Number.MAX_SAFE_INTEGER,
      ),
    ).toThrow("Invalid diagnostic clock");
    leases.enable(
      { module: "adapter", level: "trace", durationMs: 1000, adminAuthorized: true },
      1000,
    );
    expect(leases.levelFor("adapter", Number.NaN)).toBe("info");
  });
  it("does not persist leases across instances", () => {
    const leases = new DiagnosticLeases();
    leases.enable(
      { module: "adapter", level: "debug", durationMs: 1000, adminAuthorized: true },
      0,
    );
    expect(new DiagnosticLeases().levelFor("adapter", 1)).toBe("info");
  });
});

describe("Pino secret redaction", () => {
  it("redacts top-level and nested secrets, and drops raw request body/headers/query", () => {
    const chunks: string[] = [];
    const sink = new Writable({
      write(chunk, _encoding, next) {
        chunks.push(String(chunk));
        next();
      },
    });
    const logger = createLogger("adapter", "info", sink);
    logger.info(
      {
        password: "password-canary",
        passwordMD5: "md5-canary",
        token: "token-canary",
        nested: { password: "nested-canary" },
        req: {
          id: "safe-request",
          method: "GET",
          url: "/health?token=query-canary",
          headers: { authorization: "auth-canary", "x-auth-key": "ko-canary" },
          body: "body-canary",
        },
      },
      "redaction canary",
    );
    const output = chunks.join("");
    expect(output).toContain("[REDACTED]");
    for (const secret of [
      "password-canary",
      "md5-canary",
      "token-canary",
      "nested-canary",
      "query-canary",
      "auth-canary",
      "ko-canary",
      "body-canary",
    ]) {
      expect(output).not.toContain(secret);
    }
  });
});

describe("final sink protection against deep secrets and free-form logging", () => {
  it("omits arbitrary nested fields, root headers, child bindings and raw string messages", () => {
    const chunks: string[] = [];
    const sink = new Writable({
      write(chunk, _encoding, done) {
        chunks.push(String(chunk));
        done();
      },
    });
    const logger = createLogger("adapter", "info", sink);
    logger.info(
      {
        context: { auth: { token: "deep-token-canary", password: "deep-password-canary" } },
        payload: { user: { credentials: { secret: "deep-secret-canary" } } },
        headers: { authorization: "root-header-canary" },
        code: "REQUEST_SUMMARY",
        count: 3,
      },
      "raw-message-secret-canary",
    );
    logger.info("standalone-message-secret-canary");
    logger.child({ nested: { jwt: "child-binding-canary" } }).warn("child-message-secret-canary");
    const output = chunks.join("");
    expect(output).toContain('"code":"REQUEST_SUMMARY"');
    expect(output).toContain("[REDACTED]");
    expect(output).toContain("LOG_DETAILS_OMITTED");
    for (const secret of [
      "deep-token-canary",
      "deep-password-canary",
      "deep-secret-canary",
      "root-header-canary",
      "raw-message-secret-canary",
      "standalone-message-secret-canary",
      "child-binding-canary",
      "child-message-secret-canary",
    ]) {
      expect(output).not.toContain(secret);
    }
  });
});

describe("bounded in-memory safe log buffer", () => {
  it("supports bounded level, code, and correlation-id filters on allow-listed lines", () => {
    let now = 1_000;
    const buffer = new SafeLogBuffer("adapter", {
      maxEntries: 3,
      maxBytes: 2_048,
      retentionMs: 5_000,
      now: () => now,
    });
    const logger = createLogger("adapter", "info", buffer);
    const requestId = "550e8400-e29b-41d4-a716-446655440000";
    logger.info(
      {
        code: "REQUEST_SUMMARY",
        count: 1,
        req: { id: requestId, method: "GET", url: "/private?token=canary" },
      },
      "SCOPED_DIAGNOSTIC",
    );
    now += 1;
    logger.warn({ code: "SQLITE_RETRY", count: 2 }, "SCOPED_DIAGNOSTIC");
    now += 1;
    logger.error({ code: "MIGRATION_STAGE", count: 3, token: "secret-canary" }, "raw-secret");

    const info = buffer.read({ level: "info", code: "REQUEST_SUMMARY", requestId }, now);
    expect(info).toHaveLength(1);
    expect(JSON.parse(info[0]!).req.id).toBe(requestId);
    expect(buffer.read({ level: "warn" }, now)).toHaveLength(1);
    const all = buffer.read({}, now).join("");
    expect(all).not.toContain("secret-canary");
    expect(all).not.toContain("raw-secret");
    expect(all).not.toContain("/private");
  });

  it("evicts by entry count, expires by retention, and clears on request", () => {
    let now = 50;
    const buffer = new SafeLogBuffer("adapter", {
      maxEntries: 2,
      maxBytes: 1_024,
      retentionMs: 100,
      now: () => now,
    });
    const logger = createLogger("adapter", "info", buffer);
    for (let count = 1; count <= 3; count += 1) {
      logger.info({ code: "REQUEST_SUMMARY", count }, "SCOPED_DIAGNOSTIC");
    }
    const bounded = buffer.read({}, now);
    expect(bounded).toHaveLength(2);
    expect(bounded.join("")).not.toContain('"count":1');

    const byteBounded = new SafeLogBuffer("adapter", {
      maxEntries: 10,
      maxBytes: 256,
      retentionMs: 100,
      now: () => now,
    });
    const byteLogger = createLogger("adapter", "info", byteBounded);
    for (let count = 1; count <= 5; count += 1) {
      byteLogger.info({ code: "REQUEST_SUMMARY", count }, "SCOPED_DIAGNOSTIC");
    }
    const byteLimited = byteBounded.read({}, now).join("");
    expect(byteLimited).toContain('"count":5');
    expect(byteLimited).not.toContain('"count":1');

    now += 100;
    expect(buffer.read({}, now)).toEqual([]);
    logger.info({ code: "SQLITE_RETRY", count: 1 }, "SCOPED_DIAGNOSTIC");
    buffer.clear();
    expect(buffer.read({}, now)).toEqual([]);
  });

  it("rejects unbounded limits and malformed filters", () => {
    expect(() => new SafeLogBuffer("../adapter")).toThrow("Invalid log buffer module");
    expect(() => new SafeLogBuffer("adapter", { maxEntries: 10_001 })).toThrow(
      "Invalid log buffer limits",
    );
    const buffer = new SafeLogBuffer("adapter");
    expect(() => buffer.read({ level: "notice" as never })).toThrow("Invalid log buffer query");
    expect(() => buffer.read({ level: "__proto__" as never })).toThrow("Invalid log buffer query");
    expect(() => buffer.read({ requestId: "not-a-correlation-id" })).toThrow(
      "Invalid log buffer query",
    );
    expect(() => buffer.read({ extra: "ignored" } as never)).toThrow("Invalid log buffer query");
    expect(() => buffer.read(null as never)).toThrow("Invalid log buffer query");
  });
});

describe("bounded diagnostics and error sanitization", () => {
  it("does not print thrown Error.message or stack", () => {
    const chunks: string[] = [];
    const sink = new Writable({
      write(c, _enc, done) {
        chunks.push(String(c));
        done();
      },
    });
    const logger = createLogger("adapter", "info", sink);
    logger.error({ err: new Error("confidential-error-canary") }, "Safe startup failure");
    expect(chunks.join("")).not.toContain("confidential-error-canary");
    expect(chunks.join("")).not.toContain("stack");
    expect(chunks.join("")).toContain('"type":"Error"');
  });
  it("emits only named, expiring diagnostics and never arbitrary payload fields", () => {
    const chunks: string[] = [];
    const sink = new Writable({
      write(c, _enc, done) {
        chunks.push(String(c));
        done();
      },
    });
    const leases = new DiagnosticLeases();
    const scoped = createScopedDiagnostics("adapter", leases, sink);
    expect(scoped.trace({ code: "REQUEST_SUMMARY" }, 1000)).toBe(false);
    leases.enable(
      { module: "adapter", level: "trace", durationMs: 2000, adminAuthorized: true },
      1000,
    );
    expect(scoped.trace({ code: "REQUEST_SUMMARY", count: 3 }, 1001)).toBe(true);
    expect(scoped.debug({ code: "SQLITE_RETRY", count: 1 }, 1002)).toBe(true);
    expect(scoped.trace({ code: "REQUEST_SUMMARY" }, 3000)).toBe(false);
    expect(chunks.join("")).toContain("SCOPED_DIAGNOSTIC");
    expect(chunks.join("")).not.toContain("password");
  });
});
