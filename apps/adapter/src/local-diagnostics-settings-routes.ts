import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { SafeLogBuffer } from "@grimmlink/observability";
import type { OwnerAuthenticator } from "./auth/owner-auth.js";
import {
  toLogBufferLimits,
  type LocalDiagnosticsRetention,
} from "./local-diagnostics-settings-sqlite.js";
import type { LocalDiagnosticsSettingsSource } from "./local-diagnostics-settings-sqlite.js";

const PATH = "/api/grimmlink/v2/local/settings/diagnostics";
const ERROR_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["error"],
  properties: { error: { type: "string" } },
} as const;
const SETTINGS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["source", "maxEntries", "maxBytes", "retentionHours", "limits"],
  properties: {
    source: { type: "string", const: "OWNER_CONFIGURED_LOCAL_DIAGNOSTICS" },
    maxEntries: { type: "integer", minimum: 100, maximum: 10000 },
    maxBytes: { type: "integer", minimum: 262144, maximum: 8388608 },
    retentionHours: { type: "integer", minimum: 1, maximum: 24 },
    limits: {
      type: "object",
      additionalProperties: false,
      required: ["maxEntries", "maxBytes", "retentionHours"],
      properties: {
        maxEntries: { type: "integer", const: 10000 },
        maxBytes: { type: "integer", const: 8388608 },
        retentionHours: { type: "integer", const: 24 },
      },
    },
  },
} as const;
const HARD_LIMITS = Object.freeze({
  maxEntries: 10_000,
  maxBytes: 8 * 1024 * 1024,
  retentionHours: 24,
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactSettings(value: unknown): value is LocalDiagnosticsRetention {
  if (
    !isRecord(value) ||
    Object.keys(value).sort().join(",") !== "maxBytes,maxEntries,retentionHours"
  )
    return false;
  return (
    Number.isSafeInteger(value.maxEntries) &&
    (value.maxEntries as number) >= 100 &&
    (value.maxEntries as number) <= HARD_LIMITS.maxEntries &&
    Number.isSafeInteger(value.maxBytes) &&
    (value.maxBytes as number) >= 256 * 1024 &&
    (value.maxBytes as number) <= HARD_LIMITS.maxBytes &&
    Number.isSafeInteger(value.retentionHours) &&
    (value.retentionHours as number) >= 1 &&
    (value.retentionHours as number) <= HARD_LIMITS.retentionHours
  );
}

function body(value: LocalDiagnosticsRetention) {
  return Object.freeze({
    source: "OWNER_CONFIGURED_LOCAL_DIAGNOSTICS" as const,
    ...value,
    limits: HARD_LIMITS,
  });
}

function noStore(reply: FastifyReply): FastifyReply {
  return reply.header("cache-control", "no-store").header("x-content-type-options", "nosniff");
}

/** Owner and CSRF protected settings for the bounded in-memory diagnostics buffer. */
export function registerLocalDiagnosticsSettingsRoutes(
  server: FastifyInstance,
  ownerAuth: OwnerAuthenticator,
  source: LocalDiagnosticsSettingsSource,
  buffer: SafeLogBuffer,
): void {
  const ownerOnly = async (request: FastifyRequest, reply: FastifyReply) => {
    let authorized = false;
    try {
      authorized = await ownerAuth.authorizeOwner(request);
    } catch {
      authorized = false;
    }
    if (!authorized) return noStore(reply).code(403).send({ error: "OWNER_AUTH_REQUIRED" });
  };
  const ownerAndCsrf = async (request: FastifyRequest, reply: FastifyReply) => {
    await ownerOnly(request, reply);
    if (reply.sent) return;
    let valid = false;
    try {
      valid = await ownerAuth.verifyCsrf(request);
    } catch {
      valid = false;
    }
    if (!valid) return noStore(reply).code(403).send({ error: "CSRF_REQUIRED" });
  };

  server.get(
    PATH,
    {
      preHandler: ownerOnly,
      schema: {
        tags: ["Local Settings"],
        summary: "Read owner-configured bounded diagnostics retention",
        response: { 200: SETTINGS_SCHEMA, 403: ERROR_SCHEMA },
      },
    },
    async (_request, reply) => noStore(reply).send(body(source.read())),
  );
  server.put<{ Body: unknown }>(
    PATH,
    {
      bodyLimit: 1024,
      preHandler: ownerAndCsrf,
      schema: {
        tags: ["Local Settings"],
        summary: "Update bounded local diagnostics retention",
        body: {
          type: "object",
          additionalProperties: false,
          required: ["maxEntries", "maxBytes", "retentionHours"],
          properties: {
            maxEntries: { type: "integer", minimum: 100, maximum: 10000 },
            maxBytes: { type: "integer", minimum: 262144, maximum: 8388608 },
            retentionHours: { type: "integer", minimum: 1, maximum: 24 },
          },
        },
        response: { 200: SETTINGS_SCHEMA, 400: ERROR_SCHEMA, 403: ERROR_SCHEMA },
      },
    },
    async (request, reply) => {
      if (!exactSettings(request.body)) {
        return noStore(reply).code(400).send({ error: "DIAGNOSTICS_SETTINGS_INVALID" });
      }
      try {
        const saved = source.write(request.body);
        buffer.configure(toLogBufferLimits(saved));
        return noStore(reply).send(body(saved));
      } catch {
        return noStore(reply).code(409).send({ error: "DIAGNOSTICS_SETTINGS_UNAVAILABLE" });
      }
    },
  );
}
