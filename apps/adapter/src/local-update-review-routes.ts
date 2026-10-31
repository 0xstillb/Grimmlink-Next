import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { OwnerAuthenticator } from "./auth/owner-auth.js";
import { hashUpdateFeedEvidence, type UpdateFeedReader } from "./update-feed.js";
import type { LocalUpdateReviewLedger, UpdateReviewInput } from "./local-update-review-sqlite.js";
import { COMPATIBILITY_MANIFEST, COMPATIBILITY_MANIFEST_SHA256 } from "./compatibility-manifest.js";

const REVIEW_PATH = "/api/grimmlink/v2/local/update-reviews";
const SOURCE_ID = /^[a-z][a-z0-9-]{0,31}$/;
const RELEASE_TAG = /^v?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const SHA256 = /^[a-f0-9]{64}$/;
const COMPATIBILITY = new Set(["UNKNOWN", "SOURCE_BASELINE_REVIEWED_COMPATIBLE", "INCOMPATIBLE"]);
const IMPACT = new Set(["UNKNOWN", "NO_KNOWN_SOURCE_IMPACT", "POTENTIAL_IMPACT"]);
const DECISIONS = new Set(["DEFERRED", "REJECTED", "SUBMIT_FOR_PHASE09_EVALUATION"]);
const ERROR_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["error"],
  properties: { error: { type: "string" } },
} as const;
const REVIEW_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "id",
    "sourceId",
    "candidateTag",
    "evidenceSha256",
    "compatibilityManifestSha256",
    "compatibility",
    "impact",
    "decision",
    "rationale",
    "reviewer",
    "reviewedAt",
    "installationAllowed",
  ],
  properties: {
    id: { type: "string", format: "uuid" },
    sourceId: { type: "string", pattern: "^[a-z][a-z0-9-]{0,31}$" },
    candidateTag: { type: "string", maxLength: 128 },
    evidenceSha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
    compatibilityManifestSha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
    compatibility: { type: "string", enum: [...COMPATIBILITY] },
    impact: { type: "string", enum: [...IMPACT] },
    decision: { type: "string", enum: [...DECISIONS] },
    rationale: { type: "string", minLength: 20, maxLength: 500 },
    reviewer: { type: "string", const: "LOCAL_OWNER_SESSION" },
    reviewedAt: { type: "integer", minimum: 0 },
    installationAllowed: { type: "boolean", const: false },
  },
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}

function noStore(reply: FastifyReply): void {
  reply
    .header("cache-control", "no-store")
    .header("pragma", "no-cache")
    .header("x-content-type-options", "nosniff");
}

export type LocalUpdateReviewSource = Readonly<{
  ownerAuth: OwnerAuthenticator;
  reader: UpdateFeedReader;
  ledger: LocalUpdateReviewLedger;
}>;

/** Owner-only audit of an explicit compatibility/impact review; never enables installation. */
export function registerLocalUpdateReviewRoutes(
  server: FastifyInstance,
  source: LocalUpdateReviewSource,
): void {
  const ownerOnly = async (request: FastifyRequest, reply: FastifyReply) => {
    let authorized = false;
    try {
      authorized = await source.ownerAuth.authorizeOwner(request);
    } catch {
      authorized = false;
    }
    if (!authorized) return reply.code(403).send({ error: "OWNER_AUTH_REQUIRED" });
  };
  const ownerAndCsrf = async (request: FastifyRequest, reply: FastifyReply) => {
    let authorized = false;
    try {
      authorized = await source.ownerAuth.authorizeOwner(request);
    } catch {
      authorized = false;
    }
    if (!authorized) return reply.code(403).send({ error: "OWNER_AUTH_REQUIRED" });
    let csrfValid = false;
    try {
      csrfValid = await source.ownerAuth.verifyCsrf(request);
    } catch {
      csrfValid = false;
    }
    if (!csrfValid) return reply.code(403).send({ error: "CSRF_REQUIRED" });
  };

  server.get(
    REVIEW_PATH,
    {
      preValidation: ownerOnly,
      schema: {
        tags: ["Local Update Review"],
        summary: "List owner review records for release evidence",
        response: {
          200: {
            type: "object",
            additionalProperties: false,
            required: [
              "reviews",
              "compatibilityManifest",
              "compatibilityManifestSha256",
              "installationAllowed",
            ],
            properties: {
              reviews: { type: "array", maxItems: 50, items: REVIEW_SCHEMA },
              compatibilityManifest: { type: "object", additionalProperties: true },
              compatibilityManifestSha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
              installationAllowed: { type: "boolean", const: false },
            },
          },
          403: ERROR_SCHEMA,
          503: ERROR_SCHEMA,
        },
      },
    },
    async (_request, reply) => {
      noStore(reply);
      try {
        return reply.send({
          reviews: source.ledger.list(),
          compatibilityManifest: COMPATIBILITY_MANIFEST,
          compatibilityManifestSha256: COMPATIBILITY_MANIFEST_SHA256,
          installationAllowed: false,
        });
      } catch {
        return reply.code(503).send({ error: "UPDATE_REVIEW_LEDGER_UNAVAILABLE" });
      }
    },
  );

  server.post<{ Body: unknown }>(
    REVIEW_PATH,
    {
      preValidation: ownerAndCsrf,
      bodyLimit: 4096,
      schema: {
        tags: ["Local Update Review"],
        summary: "Record an owner classification for the exact current public feed evidence",
        description:
          "Re-fetches the bounded public feed and records an append-only local review if its evidence hash still matches. This is not production approval and never authorizes package download, installation, or rollback.",
        body: {
          type: "object",
          additionalProperties: false,
          required: [
            "sourceId",
            "candidateTag",
            "evidenceSha256",
            "compatibilityManifestSha256",
            "compatibility",
            "impact",
            "decision",
            "rationale",
          ],
          properties: {
            sourceId: { type: "string", pattern: "^[a-z][a-z0-9-]{0,31}$" },
            candidateTag: { type: "string", maxLength: 128 },
            evidenceSha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
            compatibilityManifestSha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
            compatibility: { type: "string", enum: [...COMPATIBILITY] },
            impact: { type: "string", enum: [...IMPACT] },
            decision: { type: "string", enum: [...DECISIONS] },
            rationale: { type: "string", minLength: 20, maxLength: 500 },
          },
        },
        response: {
          201: {
            type: "object",
            additionalProperties: false,
            required: ["review", "installationAllowed"],
            properties: {
              review: REVIEW_SCHEMA,
              installationAllowed: { type: "boolean", const: false },
            },
          },
          400: ERROR_SCHEMA,
          403: ERROR_SCHEMA,
          409: ERROR_SCHEMA,
          502: ERROR_SCHEMA,
          503: ERROR_SCHEMA,
        },
      },
    },
    async (request, reply) => {
      noStore(reply);
      const body = request.body;
      if (
        !isRecord(body) ||
        !exactKeys(body, [
          "sourceId",
          "candidateTag",
          "evidenceSha256",
          "compatibilityManifestSha256",
          "compatibility",
          "impact",
          "decision",
          "rationale",
        ]) ||
        typeof body.sourceId !== "string" ||
        !SOURCE_ID.test(body.sourceId) ||
        typeof body.candidateTag !== "string" ||
        !RELEASE_TAG.test(body.candidateTag) ||
        typeof body.evidenceSha256 !== "string" ||
        !SHA256.test(body.evidenceSha256) ||
        typeof body.compatibilityManifestSha256 !== "string" ||
        !SHA256.test(body.compatibilityManifestSha256) ||
        typeof body.compatibility !== "string" ||
        !COMPATIBILITY.has(body.compatibility) ||
        typeof body.impact !== "string" ||
        !IMPACT.has(body.impact) ||
        typeof body.decision !== "string" ||
        !DECISIONS.has(body.decision) ||
        typeof body.rationale !== "string" ||
        body.rationale.trim().length < 20 ||
        body.rationale.length > 500 ||
        /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(body.rationale)
      ) {
        return reply.code(400).send({ error: "UPDATE_REVIEW_INPUT_INVALID" });
      }
      if (body.compatibilityManifestSha256 !== COMPATIBILITY_MANIFEST_SHA256) {
        return reply.code(409).send({ error: "COMPATIBILITY_MANIFEST_STALE" });
      }
      if (
        body.decision === "SUBMIT_FOR_PHASE09_EVALUATION" &&
        (body.compatibility !== "SOURCE_BASELINE_REVIEWED_COMPATIBLE" ||
          body.impact !== "NO_KNOWN_SOURCE_IMPACT")
      ) {
        return reply.code(400).send({ error: "UPDATE_REVIEW_PHASE09_EVIDENCE_REQUIRED" });
      }

      let freshSnapshot;
      try {
        freshSnapshot = await source.reader.read(body.sourceId);
      } catch {
        return reply.code(502).send({ error: "UPDATE_FEED_UNAVAILABLE" });
      }
      if (
        freshSnapshot.release.tag !== body.candidateTag ||
        hashUpdateFeedEvidence(freshSnapshot) !== body.evidenceSha256
      ) {
        return reply.code(409).send({ error: "UPDATE_EVIDENCE_STALE" });
      }

      const review: UpdateReviewInput = {
        sourceId: body.sourceId,
        candidateTag: body.candidateTag,
        evidenceSha256: body.evidenceSha256,
        compatibilityManifestSha256: body.compatibilityManifestSha256,
        compatibility: body.compatibility as UpdateReviewInput["compatibility"],
        impact: body.impact as UpdateReviewInput["impact"],
        decision: body.decision as UpdateReviewInput["decision"],
        rationale: body.rationale.trim(),
      };
      try {
        const record = source.ledger.record(review);
        return reply.code(201).send({ review: record, installationAllowed: false });
      } catch (error) {
        if (error instanceof Error && error.message === "UPDATE_REVIEW_PHASE09_EVIDENCE_REQUIRED")
          return reply.code(400).send({ error: error.message });
        return reply.code(503).send({ error: "UPDATE_REVIEW_LEDGER_UNAVAILABLE" });
      }
    },
  );
}
