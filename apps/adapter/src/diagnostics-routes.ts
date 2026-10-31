import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  DiagnosticLeases,
  SafeLogBuffer,
  type SafeLogCode,
  type SafeLogLevel,
} from "@grimmlink/observability";

/**
 * Isolated diagnostics controls. The factory is deliberately not registered
 * by server.ts until production owner authentication and CSRF are wired.
 */
export interface IsolatedDiagnosticsSource {
  buffers: Readonly<Record<string, SafeLogBuffer>>;
  leases: DiagnosticLeases;
  authorizeOwner: (request: FastifyRequest) => Promise<boolean>;
  verifyCsrf: (request: FastifyRequest) => Promise<boolean>;
  now?: () => number;
}

const MODULE_ID = /^[a-z][a-z0-9_-]{0,63}$/;
const LOG_LEVELS = new Set<SafeLogLevel>(["trace", "debug", "info", "warn", "error", "fatal"]);
const LOG_CODES = new Set<SafeLogCode>(["REQUEST_SUMMARY", "SQLITE_RETRY", "MIGRATION_STAGE"]);
const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, expected: string): boolean =>
  Object.keys(value).sort().join(",") === expected;

export function registerIsolatedDiagnosticsRoutes(
  server: FastifyInstance,
  source: IsolatedDiagnosticsSource,
): void {
  const allowedModules = new Set(Object.keys(source.buffers));
  if (allowedModules.size === 0 || [...allowedModules].some((module) => !MODULE_ID.test(module))) {
    throw new Error("Invalid diagnostics module allowlist");
  }

  const ownerGuard = async (request: FastifyRequest, reply: FastifyReply) => {
    let authorized = false;
    try {
      authorized = await source.authorizeOwner(request);
    } catch {
      authorized = false;
    }
    if (!authorized) return reply.code(403).send({ error: "OWNER_REQUIRED" });
  };
  const ownerCsrfGuard = async (request: FastifyRequest, reply: FastifyReply) => {
    let authorized = false;
    try {
      authorized = await source.authorizeOwner(request);
    } catch {
      authorized = false;
    }
    if (!authorized) return reply.code(403).send({ error: "OWNER_REQUIRED" });
    let csrfValid = false;
    try {
      csrfValid = await source.verifyCsrf(request);
    } catch {
      csrfValid = false;
    }
    if (!csrfValid) return reply.code(403).send({ error: "CSRF_REQUIRED" });
  };
  const bufferFor = (module: string): SafeLogBuffer | null =>
    MODULE_ID.test(module) && allowedModules.has(module) ? source.buffers[module]! : null;
  const noStore = (reply: FastifyReply) => reply.header("cache-control", "no-store");

  server.get<{ Params: { module: string }; Querystring: Record<string, unknown> }>(
    "/api/grimmlink/v2/local/diagnostics/:module/logs",
    { preHandler: ownerGuard },
    async (request, reply) => {
      noStore(reply);
      const buffer = bufferFor(request.params.module);
      if (!buffer) return reply.code(404).send({ error: "DIAGNOSTICS_MODULE_NOT_FOUND" });
      const query = request.query;
      if (
        !isRecord(query) ||
        Object.keys(query).some((key) => !["level", "code", "requestId", "limit"].includes(key))
      ) {
        return reply.code(400).send({ error: "DIAGNOSTICS_QUERY_INVALID" });
      }
      const parsed: {
        level?: SafeLogLevel;
        code?: SafeLogCode;
        requestId?: string;
        limit?: number;
      } = {};
      if (query.level !== undefined) {
        if (typeof query.level !== "string" || !LOG_LEVELS.has(query.level as SafeLogLevel))
          return reply.code(400).send({ error: "DIAGNOSTICS_QUERY_INVALID" });
        parsed.level = query.level as SafeLogLevel;
      }
      if (query.code !== undefined) {
        if (typeof query.code !== "string" || !LOG_CODES.has(query.code as SafeLogCode))
          return reply.code(400).send({ error: "DIAGNOSTICS_QUERY_INVALID" });
        parsed.code = query.code as SafeLogCode;
      }
      if (query.requestId !== undefined) {
        if (typeof query.requestId !== "string" || !/^[0-9a-f-]{36}$/i.test(query.requestId))
          return reply.code(400).send({ error: "DIAGNOSTICS_QUERY_INVALID" });
        parsed.requestId = query.requestId;
      }
      if (query.limit !== undefined) {
        if (typeof query.limit !== "string" || !/^[1-9][0-9]{0,2}$/.test(query.limit))
          return reply.code(400).send({ error: "DIAGNOSTICS_QUERY_INVALID" });
        parsed.limit = Number(query.limit);
        if (parsed.limit > 500) return reply.code(400).send({ error: "DIAGNOSTICS_QUERY_INVALID" });
      }
      try {
        return reply.send({
          module: request.params.module,
          lines: buffer.read(parsed, source.now?.()),
        });
      } catch {
        return reply.code(400).send({ error: "DIAGNOSTICS_QUERY_INVALID" });
      }
    },
  );

  server.delete<{ Params: { module: string } }>(
    "/api/grimmlink/v2/local/diagnostics/:module/logs",
    { preHandler: ownerCsrfGuard },
    async (request, reply) => {
      noStore(reply);
      const buffer = bufferFor(request.params.module);
      if (!buffer) return reply.code(404).send({ error: "DIAGNOSTICS_MODULE_NOT_FOUND" });
      buffer.clear();
      return reply.send({ module: request.params.module, cleared: true });
    },
  );

  server.get<{ Params: { module: string } }>(
    "/api/grimmlink/v2/local/diagnostics/:module/lease",
    { preHandler: ownerGuard },
    async (request, reply) => {
      noStore(reply);
      if (!bufferFor(request.params.module))
        return reply.code(404).send({ error: "DIAGNOSTICS_MODULE_NOT_FOUND" });
      const active = source.leases.leaseStatus(request.params.module, source.now?.());
      return reply.send(
        active
          ? { module: request.params.module, level: active.level, expiresAt: active.expiresAt }
          : { module: request.params.module, level: "info", expiresAt: null },
      );
    },
  );

  server.put<{ Params: { module: string }; Body: unknown }>(
    "/api/grimmlink/v2/local/diagnostics/:module/lease",
    { preHandler: ownerCsrfGuard },
    async (request, reply) => {
      noStore(reply);
      if (!bufferFor(request.params.module))
        return reply.code(404).send({ error: "DIAGNOSTICS_MODULE_NOT_FOUND" });
      const body = request.body;
      if (
        !isRecord(body) ||
        !exactKeys(body, "durationMs,level") ||
        (body.level !== "debug" && body.level !== "trace") ||
        typeof body.durationMs !== "number" ||
        !Number.isSafeInteger(body.durationMs) ||
        body.durationMs <= 0
      ) {
        return reply.code(400).send({ error: "DIAGNOSTICS_LEASE_INVALID" });
      }
      try {
        source.leases.enable(
          {
            module: request.params.module,
            level: body.level,
            durationMs: body.durationMs,
            adminAuthorized: true,
          },
          source.now?.(),
        );
      } catch {
        return reply.code(400).send({ error: "DIAGNOSTICS_LEASE_INVALID" });
      }
      const active = source.leases.leaseStatus(request.params.module, source.now?.());
      return reply.send({
        module: request.params.module,
        level: active?.level ?? "info",
        expiresAt: active?.expiresAt ?? null,
      });
    },
  );

  server.delete<{ Params: { module: string } }>(
    "/api/grimmlink/v2/local/diagnostics/:module/lease",
    { preHandler: ownerCsrfGuard },
    async (request, reply) => {
      noStore(reply);
      if (!bufferFor(request.params.module))
        return reply.code(404).send({ error: "DIAGNOSTICS_MODULE_NOT_FOUND" });
      try {
        source.leases.disable({ module: request.params.module, adminAuthorized: true });
      } catch {
        return reply.code(400).send({ error: "DIAGNOSTICS_LEASE_INVALID" });
      }
      return reply.send({ module: request.params.module, level: "info", expiresAt: null });
    },
  );
}
