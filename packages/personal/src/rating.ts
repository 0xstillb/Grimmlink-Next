/** Offline mapping only. Caller-provided IDs are not authenticated principals. */
export type OfflineRatingIdentity = Readonly<{
  ownerId: string;
  bookId: string;
  bookFileId: string;
  editionSha256: string;
}>;
export type OfflineRatingReceipt = Readonly<{
  identity: OfflineRatingIdentity;
  koreaderScore: number;
  officialScore: number;
  rounding: "CEIL_HALF_TO_INTEGER";
  evidence: "OFFLINE_FIXTURE_ONLY";
  writesAllowed: false;
}>;

const validId = (value: unknown): value is string =>
  typeof value === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(value);
function validIdentity(identity: OfflineRatingIdentity): boolean {
  return (
    !!identity &&
    validId(identity.ownerId) &&
    validId(identity.bookId) &&
    validId(identity.bookFileId) &&
    typeof identity.editionSha256 === "string" &&
    /^[a-f0-9]{64}$/.test(identity.editionSha256)
  );
}

/** KOReader 1–10 maps to Official integer 1–5; odd halves round up. */
export function previewOfflineKoreaderRating(
  identity: OfflineRatingIdentity,
  score: number,
): OfflineRatingReceipt {
  if (!validIdentity(identity) || !Number.isSafeInteger(score) || score < 1 || score > 10)
    throw new Error("PHASE07_RATING_INVALID");
  return Object.freeze({
    identity: Object.freeze({ ...identity }),
    koreaderScore: score,
    officialScore: Math.ceil(score / 2),
    rounding: "CEIL_HALF_TO_INTEGER",
    evidence: "OFFLINE_FIXTURE_ONLY",
    writesAllowed: false,
  });
}

/** Preserve the original only when the same identity and Official value match. */
export function recoverOfflineKoreaderRating(
  identity: OfflineRatingIdentity,
  officialScore: number,
  receipt: OfflineRatingReceipt | null,
): Readonly<
  { status: "RECEIPT_MATCH"; koreaderScore: number } | { status: "UNRESOLVED"; koreaderScore: null }
> {
  if (
    !validIdentity(identity) ||
    !Number.isSafeInteger(officialScore) ||
    officialScore < 1 ||
    officialScore > 5
  )
    throw new Error("PHASE07_RATING_INVALID");
  if (
    !receipt ||
    receipt.evidence !== "OFFLINE_FIXTURE_ONLY" ||
    receipt.writesAllowed !== false ||
    receipt.rounding !== "CEIL_HALF_TO_INTEGER" ||
    !validIdentity(receipt.identity) ||
    receipt.identity.ownerId !== identity.ownerId ||
    receipt.identity.bookId !== identity.bookId ||
    receipt.identity.bookFileId !== identity.bookFileId ||
    receipt.identity.editionSha256 !== identity.editionSha256 ||
    !Number.isSafeInteger(receipt.koreaderScore) ||
    receipt.koreaderScore < 1 ||
    receipt.koreaderScore > 10 ||
    receipt.officialScore !== officialScore ||
    Math.ceil(receipt.koreaderScore / 2) !== officialScore
  )
    return Object.freeze({ status: "UNRESOLVED", koreaderScore: null });
  return Object.freeze({ status: "RECEIPT_MATCH", koreaderScore: receipt.koreaderScore });
}
