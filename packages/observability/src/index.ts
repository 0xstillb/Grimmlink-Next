import pino, { type Logger, type DestinationStream } from "pino";
export * from "./metrics.js";

const MAX_MS = { debug: 30 * 60_000, trace: 5 * 60_000 } as const;
export type DiagnosticLevel = keyof typeof MAX_MS;
type Lease = { level: DiagnosticLevel; expiresAt: number };

/**
 * In-memory only: diagnostics never survive a process restart. Not exposed
 * as HTTP control endpoints before Phase02 authenticates administrators.
 */
export class DiagnosticLeases {
  private readonly leases = new Map<string, Lease>();
  enable(
    input: { module: string; level: DiagnosticLevel; durationMs: number; adminAuthorized: boolean },
    now = Date.now(),
  ): void {
    if (!input.adminAuthorized) throw new Error("Admin authorization required");
    if (!/^[a-z][a-z0-9_-]{0,63}$/.test(input.module)) throw new Error("Invalid module");
    if (input.level !== "debug" && input.level !== "trace")
      throw new Error("Invalid diagnostic level");
    if (!Number.isSafeInteger(now) || !Number.isSafeInteger(now + input.durationMs))
      throw new Error("Invalid diagnostic clock");
    if (
      !Number.isSafeInteger(input.durationMs) ||
      input.durationMs <= 0 ||
      input.durationMs > MAX_MS[input.level]
    ) {
      throw new Error("Diagnostic duration exceeds limit");
    }
    this.leases.set(input.module, { level: input.level, expiresAt: now + input.durationMs });
  }
  levelFor(module: string, now = Date.now()): "info" | DiagnosticLevel {
    if (!Number.isSafeInteger(now)) return "info";
    const value = this.leases.get(module);
    if (!value) return "info";
    if (value.expiresAt <= now) {
      this.leases.delete(module);
      return "info";
    }
    return value.level;
  }
}

/**
 * Final sink allowlist. Pino redaction rules are defense-in-depth only: they
 * cannot mask arbitrary-depth data, arbitrary child bindings or free-form
 * message strings. Filter the complete serialized event BEFORE any sink sees
 * it (including child loggers and Fastify's loggerInstance).
 */
function safeLogLine(line: string, module: string): string {
  const fallback = '{"msg":"LOG_DETAILS_OMITTED"}\n';
  if (line.length > 65_536) return fallback;
  let parsed: unknown;
  try {
    parsed = JSON.parse(line) as unknown;
  } catch {
    return fallback;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return fallback;
  const raw = parsed as Record<string, unknown>;
  const safe: Record<string, unknown> = {};
  if (typeof raw.level === "number" && [10, 20, 30, 40, 50, 60].includes(raw.level)) {
    safe.level = raw.level;
  }
  if (typeof raw.time === "number" && Number.isSafeInteger(raw.time)) safe.time = raw.time;
  if (/^[a-z][a-z0-9_-]{0,63}$/.test(module)) safe.module = module;
  const messages = ["SCOPED_DIAGNOSTIC", "Adapter startup failed", "Safe startup failure"];
  safe.msg =
    typeof raw.msg === "string" && messages.includes(raw.msg) ? raw.msg : "LOG_DETAILS_OMITTED";
  const codes = ["REQUEST_SUMMARY", "SQLITE_RETRY", "MIGRATION_STAGE"];
  if (typeof raw.code === "string" && codes.includes(raw.code)) safe.code = raw.code;
  if (typeof raw.count === "number" && Number.isSafeInteger(raw.count) && raw.count >= 0) {
    safe.count = raw.count;
  }
  if (raw.err && typeof raw.err === "object" && !Array.isArray(raw.err)) {
    const type = (raw.err as Record<string, unknown>).type;
    const safeTypes = ["Error", "TypeError", "ConfigurationError", "UpstreamDisabledError"];
    safe.err = { type: typeof type === "string" && safeTypes.includes(type) ? type : "Error" };
  }
  if (raw.req && typeof raw.req === "object" && !Array.isArray(raw.req)) {
    const req = raw.req as Record<string, unknown>;
    const safeReq: Record<string, string> = {};
    if (typeof req.id === "string" && /^[0-9a-f-]{36}$/i.test(req.id)) safeReq.id = req.id;
    if (
      typeof req.method === "string" &&
      ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"].includes(req.method)
    ) {
      safeReq.method = req.method;
    }
    safe.req = safeReq;
  }
  const permitted = new Set([
    "level",
    "time",
    "pid",
    "hostname",
    "name",
    "module",
    "msg",
    "code",
    "count",
    "err",
    "req",
  ]);
  if (
    Object.keys(raw).some((key) => !permitted.has(key)) ||
    raw.msg !== safe.msg ||
    (raw.req && JSON.stringify(raw.req) !== JSON.stringify(safe.req)) ||
    (raw.err && JSON.stringify(raw.err) !== JSON.stringify(safe.err))
  ) {
    safe.redacted = "[REDACTED]";
  }
  return JSON.stringify(safe) + "\n";
}

function safeDestination(module: string, destination?: DestinationStream): DestinationStream {
  const sink = destination ?? process.stdout;
  return {
    write(chunk: string) {
      sink.write(safeLogLine(chunk, module));
    },
  };
}

/** Never serialize request bodies or raw headers in foundational logs. */
export function createLogger(
  module: string,
  level: "info" | "warn" | "error" = "info",
  destination?: DestinationStream,
): Logger {
  const options = {
    name: module,
    level,
    base: { module },
    redact: {
      paths: [
        "password",
        "passwordMD5",
        "token",
        "jwt",
        "secret",
        "req.headers.authorization",
        'req.headers["x-auth-key"]',
        'req.headers["x-auth-user"]',
        "req.body",
        "res.body",
        "*.password",
        "*.passwordMD5",
        "*.token",
        "*.jwt",
        "*.secret",
        "*.headers.authorization",
        '*.headers["x-auth-key"]',
        '*.headers["x-auth-user"]',
      ],
      censor: "[REDACTED]",
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
        id: req.id,
        method: req.method, // never log an untrusted URL path or query
      }),
    },
  };
  return pino(options, safeDestination(module, destination));
}

export type SafeDiagnosticSignal = Readonly<{
  code: "REQUEST_SUMMARY" | "SQLITE_RETRY" | "MIGRATION_STAGE";
  count?: number;
}>;
/**
 * Explicit limited diagnostic API. No raw payload, paths, headers or book data.
 * A lease only changes this named module's DEBUG/TRACE emission; never global Pino.
 */
export function createScopedDiagnostics(
  module: string,
  leases: DiagnosticLeases,
  destination?: DestinationStream,
) {
  const logger = createLogger(module, "info", destination).child({}, { level: "trace" });
  const emit = (level: DiagnosticLevel, signal: SafeDiagnosticSignal, now: number): boolean => {
    const authorized = leases.levelFor(module, now);
    if (authorized !== "trace" && (level !== "debug" || authorized !== "debug")) return false;
    const code = signal.code;
    if (code !== "REQUEST_SUMMARY" && code !== "SQLITE_RETRY" && code !== "MIGRATION_STAGE") {
      throw new Error("Unsupported diagnostic signal");
    }
    const count = signal.count;
    if (count !== undefined && (!Number.isSafeInteger(count) || count < 0))
      throw new Error("Invalid diagnostic counter");
    const safe = count === undefined ? { code } : { code, count };
    if (level === "trace") logger.trace(safe, "SCOPED_DIAGNOSTIC");
    else logger.debug(safe, "SCOPED_DIAGNOSTIC");
    return true;
  };
  return {
    debug: (signal: SafeDiagnosticSignal, now = Date.now()) => emit("debug", signal, now),
    trace: (signal: SafeDiagnosticSignal, now = Date.now()) => emit("trace", signal, now),
  };
}
