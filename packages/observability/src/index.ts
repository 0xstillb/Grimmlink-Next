import pino, { type Logger, type DestinationStream } from "pino";

const MAX_MS = { debug: 30 * 60_000, trace: 5 * 60_000 } as const;
export type DiagnosticLevel = keyof typeof MAX_MS;
type Lease = { level: DiagnosticLevel; expiresAt: number };

/**
 * In-memory only: diagnostics never survive a process restart. Not exposed
 * as HTTP control endpoints before Phase02 authenticates administrators.
 */
export class DiagnosticLeases {
  private readonly leases = new Map<string, Lease>();
  enable(input: { module: string; level: DiagnosticLevel; durationMs: number; adminAuthorized: boolean }, now = Date.now()): void {
    if (!input.adminAuthorized) throw new Error("Admin authorization required");
    if (!/^[a-z][a-z0-9_-]{0,63}$/.test(input.module)) throw new Error("Invalid module");
    if (!Number.isFinite(input.durationMs) || input.durationMs <= 0 || input.durationMs > MAX_MS[input.level]) {
      throw new Error("Diagnostic duration exceeds limit");
    }
    this.leases.set(input.module, { level: input.level, expiresAt: now + input.durationMs });
  }
  levelFor(module: string, now = Date.now()): "info" | DiagnosticLevel {
    const value = this.leases.get(module);
    if (!value) return "info";
    if (value.expiresAt <= now) {
      this.leases.delete(module);
      return "info";
    }
    return value.level;
  }
}

/** Never serialize request bodies or raw headers in foundational logs. */
export function createLogger(module: string, level: "info" | "warn" | "error" = "info", destination?: DestinationStream): Logger {
  const options = {
    name: module,
    level,
    base: { module },
    redact: {
      paths: [
        "password", "passwordMD5", "token", "jwt", "secret",
        "req.headers.authorization", 'req.headers["x-auth-key"]',
        'req.headers["x-auth-user"]', "req.body", "res.body",
        "*.password", "*.passwordMD5", "*.token", "*.jwt", "*.secret",
        "*.headers.authorization", '*.headers["x-auth-key"]', '*.headers["x-auth-user"]'
      ],
      censor: "[REDACTED]"
    },
    serializers: {
      err: (err: unknown) => {
        // Error.message and .stack may contain request URLs, passwords and tokens.
        // Do not serialize either, including during fatal startup failures.
        if (!(err instanceof Error)) return { type: "UnknownError" };
        const allowed = ["Error", "TypeError", "ConfigurationError", "UpstreamDisabledError"];
        return { type: allowed.includes(err.name) ? err.name : "Error" };
      },
      req: (req: { id?: unknown; method?: unknown; url?: unknown }) => ({
        id: req.id, method: req.method // never log an untrusted URL path or query
      })
    }
  };
  return destination ? pino(options, destination) : pino(options);
}

export type SafeDiagnosticSignal = Readonly<{
  code: "REQUEST_SUMMARY" | "SQLITE_RETRY" | "MIGRATION_STAGE";
  count?: number;
}>;
/**
 * Explicit limited diagnostic API. No raw payload, paths, headers or book data.
 * A lease only changes this named module's DEBUG/TRACE emission; never global Pino.
 */
export function createScopedDiagnostics(module: string, leases: DiagnosticLeases, destination?: DestinationStream) {
  const logger = createLogger(module, "info", destination).child({}, { level: "trace" });
  const emit = (level: DiagnosticLevel, signal: SafeDiagnosticSignal, now: number): boolean => {
    const authorized = leases.levelFor(module, now);
    if (authorized !== "trace" && (level !== "debug" || authorized !== "debug")) return false;
    const code = signal.code;
    if (code !== "REQUEST_SUMMARY" && code !== "SQLITE_RETRY" && code !== "MIGRATION_STAGE") {
      throw new Error("Unsupported diagnostic signal");
    }
    const count = signal.count;
    if (count !== undefined && (!Number.isSafeInteger(count) || count < 0)) throw new Error("Invalid diagnostic counter");
    const safe = count === undefined ? { code } : { code, count };
    if (level === "trace") logger.trace(safe, "SCOPED_DIAGNOSTIC");
    else logger.debug(safe, "SCOPED_DIAGNOSTIC");
    return true;
  };
  return {
    debug: (signal: SafeDiagnosticSignal, now = Date.now()) => emit("debug", signal, now),
    trace: (signal: SafeDiagnosticSignal, now = Date.now()) => emit("trace", signal, now)
  };
}
