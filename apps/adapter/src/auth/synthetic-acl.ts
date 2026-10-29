import { authorizeReaderResource, type VerifiedActor } from "./policy.js";

/** Phase02 offline/mock-only entitlement contract; NOT an atomic Official ACL. */
export type ResourceClaim = Readonly<{
  accountId: string;
  libraryId: string;
  bookId: string;
  fileId?: string;
  recordId?: string;
}>;
export type RightsSnapshot = Readonly<{
  accountId: string;
  libraryId: string;
  bookId: string;
  fileIds: readonly string[];
  recordIds: readonly string[];
  current: boolean;
  revoked: boolean;
}>;
export type EntitlementDecision = "ALLOW_MOCK_ONLY" | "DENY_ALL" | "INVALID_BATCH";

const token = (v: string): boolean => /^[a-zA-Z0-9_-]{1,128}$/.test(v);

/**
 * All-or-none check for *synthetic snapshots only*.
 * Denies entire batch if any missing, revoked, foreign library/book/file/row,
 * duplicate claim, stale, or unsafe actor. No partial writes or forwarding.
 * A gateway precheck is NOT equivalent to atomic rights enforcement at Official.
 */
export function checkSyntheticBatch(
  actor: VerifiedActor | null,
  claims: readonly ResourceClaim[],
  snapshots: readonly (RightsSnapshot | null)[],
  nowMs: number,
): EntitlementDecision {
  if (
    claims.length === 0 ||
    claims.length > 100 ||
    claims.length !== snapshots.length
  ) return "INVALID_BATCH";
  const seen = new Set<string>();
  for (let i = 0; i < claims.length; i++) {
    const claim = claims[i];
    const rights = snapshots[i];
    if (!claim || !rights) return "DENY_ALL";
    if (
      !token(claim.accountId) || !token(claim.libraryId) || !token(claim.bookId) ||
      (claim.fileId !== undefined && !token(claim.fileId)) ||
      (claim.recordId !== undefined && !token(claim.recordId))
    ) return "DENY_ALL";
    const composite = [
      claim.accountId, claim.libraryId, claim.bookId, claim.fileId ?? "", claim.recordId ?? "",
    ].join(":");
    if (seen.has(composite)) return "DENY_ALL";
    seen.add(composite);
    if (authorizeReaderResource(actor, claim.accountId, nowMs) !== "ALLOW") return "DENY_ALL";
    if (
      rights.current !== true ||
      rights.revoked !== false ||
      rights.accountId !== claim.accountId ||
      rights.libraryId !== claim.libraryId ||
      rights.bookId !== claim.bookId ||
      !Array.isArray(rights.fileIds) ||
      !Array.isArray(rights.recordIds) ||
      (claim.fileId !== undefined && !rights.fileIds.includes(claim.fileId)) ||
      (claim.recordId !== undefined && !rights.recordIds.includes(claim.recordId))
    ) return "DENY_ALL";
  }
  return "ALLOW_MOCK_ONLY";
}
