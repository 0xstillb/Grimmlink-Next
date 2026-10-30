import { createHash, timingSafeEqual } from "node:crypto";
import type { BookFileIdentity } from "./phase05.js";

/**
 * KOReader filename-mode identity: MD5 of the UTF-8 basename, not a title,
 * relative path, file contents, security key or proof of book entitlement.
 * Source: koreader/plugins/kosync.koplugin/main.lua#getFileNameDigest.
 */
export function koFilenameDigest(
  relativePath: string,
): Readonly<{ algorithm: "KO_FILENAME_MD5"; digest: string }> {
  if (
    typeof relativePath !== "string" ||
    !relativePath ||
    relativePath.length > 1024 ||
    relativePath.startsWith("/") ||
    relativePath.includes("\\") ||
    relativePath.includes("%") ||
    relativePath.includes("\0")
  ) {
    throw new Error("IDENTITY_UNSAFE_FILENAME");
  }
  const segments = relativePath.split("/");
  if (segments.some((part) => !part || part === "." || part === "..")) {
    throw new Error("IDENTITY_UNSAFE_FILENAME");
  }
  const basename = segments[segments.length - 1]!;
  return Object.freeze({
    algorithm: "KO_FILENAME_MD5" as const,
    digest: createHash("md5").update(basename, "utf8").digest("hex"),
  });
}

/** Never resolve filename collision by title or by first-match ordering. */
export function resolveExactFilenameBookFile(
  candidates: readonly BookFileIdentity[],
  lookup: Readonly<{
    filenameMd5: string;
    expectedSha256: string;
    bookFileId: string;
  }>,
): BookFileIdentity {
  if (
    !/^[0-9a-f]{32}$/.test(lookup.filenameMd5) ||
    !/^[0-9a-f]{64}$/.test(lookup.expectedSha256) ||
    !/^[A-Za-z0-9_-]{1,128}$/.test(lookup.bookFileId)
  ) {
    throw new Error("IDENTITY_INVALID_LOOKUP");
  }
  const matches = candidates.filter(
    (item) => koFilenameDigest(item.relativePath).digest === lookup.filenameMd5,
  );
  if (matches.length !== 1) {
    throw new Error("IDENTITY_FILENAME_MISSING_OR_COLLISION");
  }
  const match = matches[0]!;
  if (
    match.bookFileId !== lookup.bookFileId ||
    !timingSafeEqual(
      Buffer.from(match.fingerprint, "hex"),
      Buffer.from(lookup.expectedSha256, "hex"),
    )
  ) {
    throw new Error("IDENTITY_EDITION_MISMATCH");
  }
  return match;
}
