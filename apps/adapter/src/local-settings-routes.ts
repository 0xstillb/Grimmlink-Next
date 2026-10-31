import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { OwnerAuthenticator } from "./auth/owner-auth.js";

const SETTINGS_PATH = "/api/grimmlink/v2/local/settings/status";
const ERROR_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["error"],
  properties: { error: { type: "string" } },
} as const;
const POLICY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "source",
    "mode",
    "officialForwarding",
    "protectedWrites",
    "nativeKosync",
    "personalBridge",
    "sessionBridge",
    "resetProgress",
    "managedProjection",
    "automaticUpdates",
    "production",
  ],
  properties: {
    source: { type: "string", const: "CODE_ENFORCED_FAIL_CLOSED_POLICY" },
    mode: { type: "string", const: "SINGLE_OWNER_PRIVATE" },
    officialForwarding: { type: "string", const: "DENY_ALL" },
    protectedWrites: { type: "string", const: "OFF" },
    nativeKosync: { type: "string", const: "OFF" },
    personalBridge: { type: "string", const: "OFF" },
    sessionBridge: { type: "string", const: "OFF" },
    resetProgress: { type: "string", const: "OFF" },
    managedProjection: { type: "string", const: "OFF" },
    automaticUpdates: { type: "string", const: "OFF" },
    production: { type: "string", const: "NOT_AUTHORIZED" },
  },
} as const;

const POLICY = Object.freeze({
  source: "CODE_ENFORCED_FAIL_CLOSED_POLICY",
  mode: "SINGLE_OWNER_PRIVATE",
  officialForwarding: "DENY_ALL",
  protectedWrites: "OFF",
  nativeKosync: "OFF",
  personalBridge: "OFF",
  sessionBridge: "OFF",
  resetProgress: "OFF",
  managedProjection: "OFF",
  automaticUpdates: "OFF",
  production: "NOT_AUTHORIZED",
} as const);

/** Owner-authenticated read-only view of immutable safety policy, not live deployment telemetry. */
export function registerLocalSettingsRoutes(
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
    SETTINGS_PATH,
    {
      preHandler: ownerOnly,
      schema: {
        tags: ["Local Settings"],
        summary: "Read the code-enforced fail-closed safety policy",
        description:
          "Owner-authenticated read-only policy constants. This does not probe deployment, Official services or reader devices, and it cannot change settings.",
        response: { 200: POLICY_SCHEMA, 403: ERROR_SCHEMA },
      },
    },
    async (_request, reply) =>
      reply
        .header("cache-control", "no-store")
        .header("x-content-type-options", "nosniff")
        .send(POLICY),
  );
}
