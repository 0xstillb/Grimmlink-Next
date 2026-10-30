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

it("matches KOReader v2026.07.1 filename-mode golden vectors from pinned prose-reader source", () => {
  const vectors = [
    ["Alice's Adventures in Wonderland.epub", "618b7daa6ce3db03f36f673423fb874b"],
    ["Les Misérables.epub", "b52243e30c4613e8e83d76d2e7e671e4"],
    ["Les Misérables.epub", "80ce3a792df2b1865c834bc6475837f1"],
    ["日本語の本.cbz", "41c3d5deeb951e7f9222f3bc72b25fa2"],
    ["📚 library.epub", "89a4817a617be9075c87208acd845a82"],
  ] as const;
  for (const [name, expected] of vectors) {
    expect(koFilenameDigest(name).digest).toBe(expected);
  }
  expect(koFilenameDigest("Les Misérables.epub").digest)
    .not.toBe(koFilenameDigest("Les Misérables.epub").digest);
});
