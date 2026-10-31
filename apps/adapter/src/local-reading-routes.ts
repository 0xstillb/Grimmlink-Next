import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { OwnerAuthenticator } from "./auth/owner-auth.js";
import type { OwnerLocalReadingItem } from "@grimmlink/persistence";

const READING_PATH = "/api/grimmlink/v2/local/reading";
const ERROR_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["error"],
  properties: { error: { type: "string" } },
} as const;
const POSITION_SCHEMA = {
  anyOf: [
    { type: "null" },
    {
      type: "object",
      additionalProperties: false,
      required: ["kind", "nativePosition", "evidence"],
      properties: {
        kind: { type: "string", const: "EPUB_EXACT" },
        nativePosition: { type: "string", minLength: 1, maxLength: 2048 },
        evidence: {
          type: "string",
          enum: ["OFFLINE_SYNTHETIC_FIXTURE_ONLY", "EPUB_DOM_ROUNDTRIP_ONLY"],
        },
      },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["kind", "pageNumber", "pageCount", "evidence"],
      properties: {
        kind: { type: "string", const: "PDF_PAGE" },
        pageNumber: { type: "integer", minimum: 1, maximum: 100000 },
        pageCount: { type: "integer", minimum: 1, maximum: 100000 },
        evidence: { type: "string", const: "OFFLINE_FIXTURE_PAGE_COUNT_ONLY" },
      },
    },
  ],
} as const;
const ITEM_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "bookId",
    "bookFileId",
    "format",
    "editionSha256",
    "revision",
    "status",
    "position",
    "percentage",
  ],
  properties: {
    bookId: { type: "string", pattern: "^[A-Za-z0-9_-]{1,128}$" },
    bookFileId: { type: "string", pattern: "^[A-Za-z0-9_-]{1,128}$" },
    format: { type: "string", enum: ["EPUB", "PDF"] },
    editionSha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
    revision: { type: "integer", minimum: 0 },
    status: { type: "string", enum: ["NO_POSITION", "LOCAL_PREVIEW_ONLY"] },
    position: POSITION_SCHEMA,
    percentage: { type: "null" },
  },
} as const;

export type LocalReadingRouteSource = Readonly<{
  authorizeOwner: OwnerAuthenticator["authorizeOwner"];
  listReading: () => Readonly<{ items: readonly OwnerLocalReadingItem[]; truncated: boolean }>;
}>;

export function registerLocalReadingRoutes(
  server: FastifyInstance,
  source: LocalReadingRouteSource,
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
    READING_PATH,
    {
      preValidation: ownerOnly,
      schema: {
        tags: ["Local Reading"],
        summary: "Read the owner-scoped offline Continue Reading projection",
        description:
          "Shows only local Phase06 rows and their explicit fixture/DOM evidence. Percentages, live reader data and Official progress are never returned.",
        response: {
          200: {
            type: "object",
            additionalProperties: false,
            required: ["source", "items", "truncated", "readerConnection", "officialWrites"],
            properties: {
              source: { type: "string", const: "LOCAL_SQLITE_PHASE06_OFFLINE" },
              items: { type: "array", maxItems: 100, items: ITEM_SCHEMA },
              truncated: { type: "boolean" },
              readerConnection: { type: "string", const: "NOT_CONNECTED" },
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
        const snapshot = source.listReading();
        if (snapshot.items.length > 100) throw new Error("READING_RESULT_TOO_LARGE");
        return reply.send({
          source: "LOCAL_SQLITE_PHASE06_OFFLINE",
          ...snapshot,
          readerConnection: "NOT_CONNECTED",
          officialWrites: "OFF",
        });
      } catch {
        return reply.code(503).send({ error: "LOCAL_READING_UNAVAILABLE" });
      }
    },
  );
}
