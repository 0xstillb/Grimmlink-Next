import { randomUUID } from "node:crypto";
import type { LocalStore } from "@grimmlink/persistence";

export type UpdateReviewCompatibility =
  | "UNKNOWN"
  | "SOURCE_BASELINE_REVIEWED_COMPATIBLE"
  | "INCOMPATIBLE";
export type UpdateReviewImpact = "UNKNOWN" | "NO_KNOWN_SOURCE_IMPACT" | "POTENTIAL_IMPACT";
export type UpdateReviewDecision = "DEFERRED" | "REJECTED" | "SUBMIT_FOR_PHASE09_EVALUATION";

export type UpdateReviewInput = Readonly<{
  sourceId: string;
  candidateTag: string;
  evidenceSha256: string;
  compatibilityManifestSha256: string;
  compatibility: UpdateReviewCompatibility;
  impact: UpdateReviewImpact;
  decision: UpdateReviewDecision;
  rationale: string;
}>;

export type UpdateReviewRecord = UpdateReviewInput &
  Readonly<{
    id: string;
    reviewer: "LOCAL_OWNER_SESSION";
    reviewedAt: number;
    installationAllowed: false;
  }>;

const SOURCE_ID = /^[a-z][a-z0-9-]{0,31}$/;
const RELEASE_TAG = /^v?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const SHA256 = /^[a-f0-9]{64}$/;
const COMPATIBILITY = new Set<UpdateReviewCompatibility>([
  "UNKNOWN",
  "SOURCE_BASELINE_REVIEWED_COMPATIBLE",
  "INCOMPATIBLE",
]);
const IMPACT = new Set<UpdateReviewImpact>([
  "UNKNOWN",
  "NO_KNOWN_SOURCE_IMPACT",
  "POTENTIAL_IMPACT",
]);
const DECISIONS = new Set<UpdateReviewDecision>([
  "DEFERRED",
  "REJECTED",
  "SUBMIT_FOR_PHASE09_EVALUATION",
]);

function validateReview(input: UpdateReviewInput): void {
  if (
    !SOURCE_ID.test(input.sourceId) ||
    !RELEASE_TAG.test(input.candidateTag) ||
    !SHA256.test(input.evidenceSha256) ||
    !SHA256.test(input.compatibilityManifestSha256) ||
    !COMPATIBILITY.has(input.compatibility) ||
    !IMPACT.has(input.impact) ||
    !DECISIONS.has(input.decision) ||
    input.rationale.trim().length < 20 ||
    input.rationale.length > 500 ||
    /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(input.rationale)
  ) {
    throw new Error("UPDATE_REVIEW_INPUT_INVALID");
  }
  if (
    input.decision === "SUBMIT_FOR_PHASE09_EVALUATION" &&
    (input.compatibility !== "SOURCE_BASELINE_REVIEWED_COMPATIBLE" ||
      input.impact !== "NO_KNOWN_SOURCE_IMPACT")
  ) {
    throw new Error("UPDATE_REVIEW_PHASE09_EVIDENCE_REQUIRED");
  }
}

/** Append-only owner review ledger. It records a decision but can never authorize installation. */
export function createLocalUpdateReviewLedger(store: LocalStore, now: () => number = Date.now) {
  const { sqlite } = store;
  const listStatement = sqlite.prepare(
    `SELECT id, source_id, candidate_tag, evidence_sha256, compatibility_manifest_sha256,
            compatibility, impact,
            decision, rationale, reviewer, reviewed_at, installation_allowed
       FROM update_review_records
      ORDER BY reviewed_at DESC, id DESC
      LIMIT 50`,
  );
  const insertStatement = sqlite.prepare(
    `INSERT INTO update_review_records
       (id, source_id, candidate_tag, evidence_sha256, compatibility_manifest_sha256,
        compatibility, impact, decision,
        rationale, reviewer, reviewed_at, installation_allowed)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'LOCAL_OWNER_SESSION', ?, 0)`,
  );

  return Object.freeze({
    list(): readonly UpdateReviewRecord[] {
      const rows = listStatement.all() as readonly Record<string, unknown>[];
      return rows.map((row) => ({
        id: String(row.id),
        sourceId: String(row.source_id),
        candidateTag: String(row.candidate_tag),
        evidenceSha256: String(row.evidence_sha256),
        compatibilityManifestSha256: String(row.compatibility_manifest_sha256),
        compatibility: row.compatibility as UpdateReviewCompatibility,
        impact: row.impact as UpdateReviewImpact,
        decision: row.decision as UpdateReviewDecision,
        rationale: String(row.rationale),
        reviewer: "LOCAL_OWNER_SESSION",
        reviewedAt: Number(row.reviewed_at),
        installationAllowed: false,
      }));
    },
    record(input: UpdateReviewInput): UpdateReviewRecord {
      validateReview(input);
      const reviewedAt = now();
      if (!Number.isSafeInteger(reviewedAt) || reviewedAt < 0)
        throw new Error("UPDATE_REVIEW_CLOCK_INVALID");
      const record: UpdateReviewRecord = {
        ...input,
        id: randomUUID(),
        reviewer: "LOCAL_OWNER_SESSION",
        reviewedAt,
        installationAllowed: false,
      };
      insertStatement.run(
        record.id,
        record.sourceId,
        record.candidateTag,
        record.evidenceSha256,
        record.compatibilityManifestSha256,
        record.compatibility,
        record.impact,
        record.decision,
        record.rationale.trim(),
        record.reviewedAt,
      );
      return record;
    },
  });
}

export type LocalUpdateReviewLedger = ReturnType<typeof createLocalUpdateReviewLedger>;
