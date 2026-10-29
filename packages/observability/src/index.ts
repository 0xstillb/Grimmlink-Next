import pino, { type Logger } from "pino";

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
export function createLogger(module: string, level: "info" | "warn" | "error" = "info"): Logger {
  return pino({
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
      err: pino.stdSerializers.err,
      req: (req: { id?: unknown; method?: unknown; url?: unknown }) => ({
        id: req.id, method: req.method, path: typeof req.url === "string" ? req.url.split("?")[0] : undefined
      })
    }
  });
}
