import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { OwnerAuthenticator } from "./auth/owner-auth.js";

const SCREEN_STATUS_PATH = "/api/grimmlink/v2/local/screens/status";
const ERROR_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["error"],
  properties: { error: { type: "string" } },
} as const;
const STATUS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["source", "identity", "reading", "opds"],
  properties: {
    source: { type: "string", const: "NO_DOMAIN_PROVIDER_CONFIGURED" },
    identity: {
      type: "object",
      additionalProperties: false,
      required: ["status", "reason"],
      properties: {
        status: { type: "string", const: "UNAVAILABLE" },
        reason: { type: "string", const: "TRUSTED_IDENTITY_PROVIDER_NOT_CONFIGURED" },
      },
    },
    reading: {
      type: "object",
      additionalProperties: false,
      required: ["status", "reason"],
      properties: {
        status: { type: "string", const: "UNAVAILABLE" },
        reason: { type: "string", const: "READER_READBACK_PROVIDER_NOT_CONFIGURED" },
      },
    },
    opds: {
      type: "object",
      additionalProperties: false,
      required: ["status", "reason"],
      properties: {
        status: { type: "string", const: "UNAVAILABLE" },
        reason: { type: "string", const: "CATALOG_PROVIDER_NOT_CONFIGURED" },
      },
    },
  },
} as const;

const STATUS = Object.freeze({
  source: "NO_DOMAIN_PROVIDER_CONFIGURED",
  identity: {
    status: "UNAVAILABLE",
    reason: "TRUSTED_IDENTITY_PROVIDER_NOT_CONFIGURED",
  },
  reading: {
    status: "UNAVAILABLE",
    reason: "READER_READBACK_PROVIDER_NOT_CONFIGURED",
  },
  opds: {
    status: "UNAVAILABLE",
    reason: "CATALOG_PROVIDER_NOT_CONFIGURED",
  },
} as const);

/** Reports explicit unavailable states; it does not fabricate identity, reading or catalog data. */
export function registerLocalScreenStatusRoutes(
  server: FastifyInstance,
  ownerAuth: OwnerAuthenticator,
): void {
  const ownerOnly = async (request: FastifyRequest, reply: FastifyReply) => {
    let authorized = false;
    try {
      authorized = await ownerAuth.authorizeOwner(request);
    } catch {
      authorized = false;
    }
    if (!authorized) return reply.code(403).send({ error: "OWNER_AUTH_REQUIRED" });
  };

  server.get(
    SCREEN_STATUS_PATH,
    {
      preHandler: ownerOnly,
      schema: {
        tags: ["Local Screen Status"],
        summary: "Read explicit unavailable states for unconfigured domain providers",
        description:
          "Owner-authenticated local status only. No reader inventory, reading position, catalog or remote service is queried; all three providers are currently unconfigured.",
        response: { 200: STATUS_SCHEMA, 403: ERROR_SCHEMA },
      },
    },
    async (_request, reply) =>
      reply
        .header("cache-control", "no-store")
        .header("x-content-type-options", "nosniff")
        .send(STATUS),
  );
}
