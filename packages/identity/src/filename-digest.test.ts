import { describe, expect, it } from "vitest";
import { fingerprintBookFile } from "./phase05.js";
import { koFilenameDigest, resolveExactFilenameBookFile } from "./filename-digest.js";

const one = fingerprintBookFile({
  bookId: "book1",
  bookFileId: "file1",
  relativePath: "novels/book.epub",
  bytes: Buffer.from("edition one"),
});

describe("KOReader filename-mode identity", () => {
  it("uses exact basename bytes and KO_FILENAME_MD5 tag", () => {
    expect(koFilenameDigest("novels/book.epub")).toEqual({
      algorithm: "KO_FILENAME_MD5",
      digest: "03053ffc045564439ff7f2cabb3b58c5",
    });
    expect(
      resolveExactFilenameBookFile([one], {
        filenameMd5: koFilenameDigest(one.relativePath).digest,
        expectedSha256: one.fingerprint,
        bookFileId: one.bookFileId,
      }),
    ).toEqual(one);
  });

  it("refuses a same-name different-byte edition collision", () => {
    const two = fingerprintBookFile({
      bookId: "book2",
      bookFileId: "file2",
      relativePath: "other/book.epub",
      bytes: Buffer.from("edition two"),
    });
    expect(() =>
      resolveExactFilenameBookFile([one, two], {
        filenameMd5: koFilenameDigest(one.relativePath).digest,
        expectedSha256: one.fingerprint,
        bookFileId: one.bookFileId,
      }),
    ).toThrow("IDENTITY_FILENAME_MISSING_OR_COLLISION");
  });

  it("refuses ambiguous paths and stale bytes", () => {
    expect(() => koFilenameDigest("../book.epub")).toThrow("IDENTITY_UNSAFE_FILENAME");
    expect(() =>
      resolveExactFilenameBookFile([one], {
        filenameMd5: koFilenameDigest(one.relativePath).digest,
        expectedSha256: "f".repeat(64),
        bookFileId: one.bookFileId,
      }),
    ).toThrow("IDENTITY_EDITION_MISMATCH");
  });
});
