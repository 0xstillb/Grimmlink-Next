import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { parseOpfPreview, planCoverPath } from "@grimmlink/ingestion";
import type { OwnerAuthenticator } from "./auth/owner-auth.js";

const OPF_PREVIEW_PATH = "/api/grimmlink/v2/local/opf/preview";
const MAX_OPF_BYTES = 1024 * 1024;
const ERROR_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["error"],
  properties: { error: { type: "string" } },
} as const;
const PREVIEW_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["metadata", "coverHref", "action", "writesAllowed", "source"],
  properties: {
    metadata: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string", maxLength: 512 },
        subtitle: { type: "string", maxLength: 512 },
        publisher: { type: "string", maxLength: 512 },
        publishedDate: { type: "string", maxLength: 512 },
        description: { type: "string", maxLength: 8192 },
        seriesName: { type: "string", maxLength: 512 },
        seriesNumber: { type: "number", exclusiveMinimum: 0, maximum: 100000 },
        isbn13: { type: "string", maxLength: 512 },
        isbn10: { type: "string", maxLength: 512 },
        language: { type: "string", maxLength: 512 },
      },
    },
    coverHref: { anyOf: [{ type: "string", maxLength: 2048 }, { type: "null" }] },
    action: { type: "string", const: "DRY_RUN_ONLY" },
    writesAllowed: { type: "boolean", const: false },
    source: { type: "string", const: "OWNER_SELECTED_OPF" },
  },
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Parses only OPF bytes explicitly submitted by the owner. It has no disk, NAS, or Official I/O. */
export function registerLocalOpfPreviewRoutes(
  server: FastifyInstance,
  ownerAuth: OwnerAuthenticator,
): void {
  const ownerAndCsrf = async (request: FastifyRequest, reply: FastifyReply) => {
    let owner = false;
    try {
      owner = await ownerAuth.authorizeOwner(request);
    } catch {
      owner = false;
    }
    if (!owner) return reply.code(403).send({ error: "OWNER_AUTH_REQUIRED" });
    let csrf = false;
    try {
      csrf = await ownerAuth.verifyCsrf(request);
    } catch {
      csrf = false;
    }
    if (!csrf) return reply.code(403).send({ error: "CSRF_REQUIRED" });
  };

  server.post<{ Body: unknown }>(
    OPF_PREVIEW_PATH,
    {
      preHandler: ownerAndCsrf,
      bodyLimit: MAX_OPF_BYTES + 64 * 1024,
      schema: {
        tags: ["Local OPF Preview"],
        summary: "Parse one owner-selected OPF file in memory",
        description:
          "Owner- and CSRF-authenticated preview of submitted UTF-8 OPF bytes only. The file is not saved, no NAS is scanned, and no metadata or cover is written upstream.",
        body: {
          type: "object",
          additionalProperties: false,
          required: ["opfXml"],
          properties: { opfXml: { type: "string", minLength: 1, maxLength: MAX_OPF_BYTES } },
        },
        response: {
          200: PREVIEW_SCHEMA,
          400: ERROR_SCHEMA,
          403: ERROR_SCHEMA,
        },
      },
    },
    async (request, reply) => {
      reply.header("cache-control", "no-store").header("x-content-type-options", "nosniff");
      const body = request.body;
      if (
        !isRecord(body) ||
        Object.keys(body).length !== 1 ||
        typeof body.opfXml !== "string" ||
        body.opfXml.length === 0 ||
        Buffer.byteLength(body.opfXml, "utf8") > MAX_OPF_BYTES
      ) {
        return reply.code(400).send({ error: "OPF_PREVIEW_INPUT_INVALID" });
      }

      try {
        const parsed = parseOpfPreview(Buffer.from(body.opfXml, "utf8"));
        if (parsed.coverHref !== null) {
          if (parsed.coverHref.length > 2048) throw new Error("OPF_COVER_REFERENCE_TOO_LONG");
          planCoverPath("owner-selected.opf", parsed.coverHref);
        }
        return reply.send({
          metadata: parsed.metadata,
          coverHref: parsed.coverHref,
          action: "DRY_RUN_ONLY",
          writesAllowed: false,
          source: "OWNER_SELECTED_OPF",
        });
      } catch {
        return reply.code(400).send({ error: "OPF_PREVIEW_INVALID" });
      }
    },
  );
}
