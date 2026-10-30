import { createHash, timingSafeEqual } from "node:crypto";

/** A byte fingerprint is evidence of an edition, never proof of an owner's rights. */
export type BookFileIdentity = Readonly<{
  bookId: string;
  bookFileId: string;
  relativePath: string;
  byteLength: number;
  fingerprintAlgorithm: "SHA256_FULL_BYTES";
  fingerprint: string;
  koDocumentHash: Readonly<{ algorithm: "KO_PARTIAL_MD5"; digest: string }> | null;
  entitlementVerified: false;
}>;

const id = (value: string): boolean => /^[A-Za-z0-9_-]{1,128}$/.test(value);
const digest = (value: string): boolean => /^[0-9a-f]{32}$/.test(value);

/**
 * KO partial-MD5 MUST be provided by a separately verified upstream-compatible
 * helper/fixture. Do not substitute the full-file MD5 or guess the KO algorithm.
 */
export function fingerprintBookFile(input: {
  bookId: string;
  bookFileId: string;
  relativePath: string;
  bytes: Uint8Array;
  koPartialMd5?: string;
}): BookFileIdentity {
  if (!id(input.bookId) || !id(input.bookFileId)) throw new Error("IDENTITY_INVALID_ID");
  const path = input.relativePath;
  if (
    path.length > 1024 ||
    !path ||
    path.startsWith("/") ||
    path.includes("\\") ||
    path.includes("%") ||
    path.includes("\0") ||
    path.split("/").some((part) => !part || part === "." || part === "..")
  ) {
    throw new Error("IDENTITY_UNSAFE_PATH");
  }
  if (!(input.bytes instanceof Uint8Array) || input.bytes.byteLength === 0) {
    throw new Error("IDENTITY_MISSING_BYTES");
  }
  if (input.koPartialMd5 !== undefined && !digest(input.koPartialMd5)) {
    throw new Error("IDENTITY_INVALID_KO_HASH");
  }
  return Object.freeze({
    bookId: input.bookId,
    bookFileId: input.bookFileId,
    relativePath: path,
    byteLength: input.bytes.byteLength,
    fingerprintAlgorithm: "SHA256_FULL_BYTES" as const,
    fingerprint: createHash("sha256").update(input.bytes).digest("hex"),
    koDocumentHash: input.koPartialMd5
      ? Object.freeze({ algorithm: "KO_PARTIAL_MD5" as const, digest: input.koPartialMd5 })
      : null,
    entitlementVerified: false as const,
  });
}

/** Refuse same-title guesses, stale edition hashes and ambiguous KO mappings. */
export function resolveExactBookFile(
  candidates: readonly BookFileIdentity[],
  lookup: { koPartialMd5: string; expectedSha256: string; bookFileId: string },
): BookFileIdentity {
  if (
    !digest(lookup.koPartialMd5) ||
    !/^[0-9a-f]{64}$/.test(lookup.expectedSha256) ||
    !id(lookup.bookFileId)
  ) {
    throw new Error("IDENTITY_INVALID_LOOKUP");
  }
  const matches = candidates.filter((item) => item.koDocumentHash?.digest === lookup.koPartialMd5);
  if (matches.length !== 1) throw new Error("IDENTITY_MISSING_OR_COLLISION");
  const match = matches[0]!;
  const observed = Buffer.from(match.fingerprint, "hex");
  const expected = Buffer.from(lookup.expectedSha256, "hex");
  if (
    match.bookFileId !== lookup.bookFileId ||
    !timingSafeEqual(observed, expected)
  ) {
    throw new Error("IDENTITY_EDITION_MISMATCH");
  }
  return match;
}
