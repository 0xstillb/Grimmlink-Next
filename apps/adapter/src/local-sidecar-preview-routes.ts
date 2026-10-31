import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { parseSidecarPreview } from "@grimmlink/ingestion";
import type { OwnerAuthenticator } from "./auth/owner-auth.js";

const SIDECAR_PREVIEW_PATH = "/api/grimmlink/v2/local/sidecar/preview";
const MAX_SIDECAR_BYTES = 1024 * 1024;
const ERROR_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["error"],
  properties: { error: { type: "string" } },
} as const;
const PREVIEW_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "metadata",
    "action",
    "writesAllowed",
    "source",
    "importsEnabled",
    "adjacentWriteEnabled",
  ],
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
    action: { type: "string", const: "PREVIEW_ONLY" },
    writesAllowed: { type: "boolean", const: false },
    source: { type: "string", const: "OWNER_SELECTED_SIDECAR" },
    importsEnabled: { type: "boolean", const: false },
    adjacentWriteEnabled: { type: "boolean", const: false },
  },
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Parses one owner-submitted Sidecar JSON file in memory. No disk, NAS, or Official I/O exists. */
export function registerLocalSidecarPreviewRoutes(
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
    SIDECAR_PREVIEW_PATH,
    {
      preHandler: ownerAndCsrf,
      bodyLimit: MAX_SIDECAR_BYTES + 64 * 1024,
      schema: {
        tags: ["Local Sidecar Preview"],
        summary: "Parse one owner-selected Sidecar JSON file in memory",
        description:
          "Owner- and CSRF-authenticated preview of submitted Sidecar bytes only. The file is not saved, no NAS is scanned, and imports and adjacent writes are disabled.",
        body: {
          type: "object",
          additionalProperties: false,
          required: ["sidecarJson"],
          properties: {
            sidecarJson: { type: "string", minLength: 2, maxLength: MAX_SIDECAR_BYTES },
          },
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
        typeof body.sidecarJson !== "string" ||
        body.sidecarJson.length < 2 ||
        Buffer.byteLength(body.sidecarJson, "utf8") > MAX_SIDECAR_BYTES
      ) {
        return reply.code(400).send({ error: "SIDECAR_PREVIEW_INPUT_INVALID" });
      }

      try {
        const parsed = parseSidecarPreview(Buffer.from(body.sidecarJson, "utf8"));
        return reply.send({
          metadata: parsed.metadata,
          action: "PREVIEW_ONLY",
          writesAllowed: false,
          source: "OWNER_SELECTED_SIDECAR",
          importsEnabled: false,
          adjacentWriteEnabled: false,
        });
      } catch {
        return reply.code(400).send({ error: "SIDECAR_PREVIEW_INVALID" });
      }
    },
  );
}
