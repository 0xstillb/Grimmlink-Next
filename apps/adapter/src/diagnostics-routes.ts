import { createHash, randomBytes } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  DiagnosticLeases,
  SafeLogBuffer,
  type SafeLogCode,
  type SafeLogLevel,
} from "@grimmlink/observability";

/**
 * Isolated diagnostics controls. The server registers these routes only when
 * its caller supplies trusted owner-session and CSRF verifiers; the default
 * process has no authenticated session provider and keeps them unmounted.
 */
export interface IsolatedDiagnosticsSource {
  buffers: Readonly<Record<string, SafeLogBuffer>>;
  leases: DiagnosticLeases;
  authorizeOwner: (request: FastifyRequest) => Promise<boolean>;
  verifyCsrf: (request: FastifyRequest) => Promise<boolean>;
  now?: () => number;
}

const MODULE_ID = /^[a-z][a-z0-9_-]{0,63}$/;
const SUPPORT_BUNDLE_ID = /^[A-Za-z0-9_-]{22}$/;
const SUPPORT_BUNDLE_PATH = "/api/grimmlink/v2/local/support-bundle";
const SUPPORT_BUNDLE_TTL_MS = 60 * 60_000;
const SUPPORT_BUNDLE_MAX_COUNT = 8;
const SUPPORT_BUNDLE_MAX_BYTES = 256 * 1024;
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
  type StoredSupportBundle = Readonly<{
    expiresAtMs: number;
    content: Readonly<Record<string, unknown>>;
  }>;
  const supportBundleNow = (): number | null => {
    try {
      return source.now?.() ?? Date.now();
    } catch {
      return null;
    }
  };
  const supportBundles = new Map<string, StoredSupportBundle>();
  const pruneSupportBundles = (at: number) => {
    for (const [id, bundle] of supportBundles) {
      if (bundle.expiresAtMs <= at) supportBundles.delete(id);
    }
  };

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

  server.post(`${SUPPORT_BUNDLE_PATH}`, { preHandler: ownerCsrfGuard }, async (_request, reply) => {
    noStore(reply);
    const at = supportBundleNow();
    if (at === null) return reply.code(503).send({ error: "SUPPORT_BUNDLE_UNAVAILABLE" });
    if (!Number.isSafeInteger(at) || at < 0 || !Number.isSafeInteger(at + SUPPORT_BUNDLE_TTL_MS)) {
      return reply.code(503).send({ error: "SUPPORT_BUNDLE_UNAVAILABLE" });
    }
    const createdDate = new Date(at);
    const expiresAtMs = at + SUPPORT_BUNDLE_TTL_MS;
    const expiresDate = new Date(expiresAtMs);
    if (!Number.isFinite(createdDate.getTime()) || !Number.isFinite(expiresDate.getTime())) {
      return reply.code(503).send({ error: "SUPPORT_BUNDLE_UNAVAILABLE" });
    }
    let lines: readonly string[];
    try {
      lines = source.buffers.adapter?.read({ limit: 100 }, at) ?? [];
    } catch {
      return reply.code(503).send({ error: "SUPPORT_BUNDLE_UNAVAILABLE" });
    }
    const report = {
      schema: "grimmlink.phase08.support-report.v1",
      generatedAt: createdDate.toISOString(),
      scope: "SAFE_LOCAL_PROCESS_STATUS",
      status: {
        mode: "MOCK_ONLY",
        officialConnected: false,
        gatewayForwarding: "DENY_ALL",
        protectedWrites: "OFF",
      },
      diagnostics: lines,
    };
    const canonicalReport = JSON.stringify(report);
    const checksumSha256 = createHash("sha256").update(canonicalReport, "utf8").digest("hex");
    const content = {
      schema: "grimmlink.phase08.support-bundle.v1",
      createdAt: createdDate.toISOString(),
      expiresAt: expiresDate.toISOString(),
      checksum: { algorithm: "SHA-256", covers: "report-json-v1", value: checksumSha256 },
      report,
    };
    if (Buffer.byteLength(JSON.stringify(content), "utf8") > SUPPORT_BUNDLE_MAX_BYTES) {
      return reply.code(503).send({ error: "SUPPORT_BUNDLE_UNAVAILABLE" });
    }
    pruneSupportBundles(at);
    while (supportBundles.size >= SUPPORT_BUNDLE_MAX_COUNT) {
      const oldest = supportBundles.keys().next().value as string | undefined;
      if (oldest === undefined) break;
      supportBundles.delete(oldest);
    }
    const bundleId = randomBytes(16).toString("base64url");
    supportBundles.set(bundleId, { expiresAtMs, content });
    return reply.send({
      bundleId,
      checksumSha256,
      expiresAt: expiresDate.toISOString(),
    });
  });

  server.get<{ Params: { id: string } }>(
    `${SUPPORT_BUNDLE_PATH}/:id`,
    { preHandler: ownerGuard },
    async (request, reply) => {
      noStore(reply);
      const at = supportBundleNow();
      if (
        at === null ||
        !Number.isSafeInteger(at) ||
        at < 0 ||
        !SUPPORT_BUNDLE_ID.test(request.params.id)
      ) {
        return reply.code(404).send({ error: "SUPPORT_BUNDLE_NOT_FOUND" });
      }
      pruneSupportBundles(at);
      const bundle = supportBundles.get(request.params.id);
      if (!bundle) return reply.code(404).send({ error: "SUPPORT_BUNDLE_NOT_FOUND" });
      return reply
        .header("content-disposition", 'attachment; filename="grimmlink-support-bundle.json"')
        .type("application/json; charset=utf-8")
        .send(bundle.content);
    },
  );
}
