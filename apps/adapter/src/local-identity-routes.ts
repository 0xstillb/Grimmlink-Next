import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { OfflineIdentityRegistration } from "@grimmlink/persistence";
import type { OwnerAuthenticator } from "./auth/owner-auth.js";

const IDENTITY_PATH = "/api/grimmlink/v2/local/identity";
const ERROR_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["error"],
  properties: { error: { type: "string" } },
} as const;
const ITEM_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "koDocumentMd5",
    "bookFileId",
    "editionSha256",
    "localWriterMode",
    "revision",
    "identityEvidence",
  ],
  properties: {
    koDocumentMd5: { type: "string", pattern: "^[a-f0-9]{32}$" },
    bookFileId: { type: "string", pattern: "^[A-Za-z0-9_-]{1,128}$" },
    editionSha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
    localWriterMode: { type: "string", enum: ["DISABLED", "MOCK_MANAGED"] },
    revision: { type: "integer", minimum: 0 },
    identityEvidence: { type: "string", const: "LOCAL_REGISTRATION_ONLY" },
  },
} as const;

export type LocalIdentityRouteSource = Readonly<{
  authorizeOwner: OwnerAuthenticator["authorizeOwner"];
  listIdentities: () => Readonly<{
    items: readonly OfflineIdentityRegistration[];
    truncated: boolean;
  }>;
}>;

export function registerLocalIdentityRoutes(
  server: FastifyInstance,
  source: LocalIdentityRouteSource,
): void {
  const ownerOnly = async (request: FastifyRequest, reply: FastifyReply) => {
    let authorized = false;
    try {
      authorized = await source.authorizeOwner(request);
    } catch {
      authorized = false;
    }
    if (!authorized) return reply.code(403).send({ error: "OWNER_AUTH_REQUIRED" });
  };

  server.get(
    IDENTITY_PATH,
    {
      preValidation: ownerOnly,
      schema: {
        tags: ["Local Identity"],
        summary: "Read locally registered book-file identity fixtures",
        description:
          "Returns only the local Phase05 registration. It does not prove Official ownership, entitlement, or a live reader connection.",
        response: {
          200: {
            type: "object",
            additionalProperties: false,
            required: ["source", "officialOwnership", "items", "truncated", "officialWrites"],
            properties: {
              source: { type: "string", const: "LOCAL_SQLITE_PHASE05_OFFLINE" },
              officialOwnership: { type: "string", const: "NOT_VERIFIED" },
              items: { type: "array", maxItems: 100, items: ITEM_SCHEMA },
              truncated: { type: "boolean" },
              officialWrites: { type: "string", const: "OFF" },
            },
          },
          403: ERROR_SCHEMA,
          503: ERROR_SCHEMA,
        },
      },
    },
    async (_request, reply) => {
      reply.header("cache-control", "no-store").header("x-content-type-options", "nosniff");
      try {
        const snapshot = source.listIdentities();
        if (snapshot.items.length > 100) throw new Error("IDENTITY_RESULT_TOO_LARGE");
        return reply.send({
          source: "LOCAL_SQLITE_PHASE05_OFFLINE",
          officialOwnership: "NOT_VERIFIED",
          ...snapshot,
          officialWrites: "OFF",
        });
      } catch {
        return reply.code(503).send({ error: "LOCAL_IDENTITY_UNAVAILABLE" });
      }
    },
  );
}
