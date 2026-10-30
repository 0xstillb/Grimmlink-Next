import { describe, expect, it } from "vitest";
import { fingerprintBookFile, resolveExactBookFile } from "./phase05.js";

const ko = "a".repeat(32);
const one = fingerprintBookFile({
  bookId: "b1",
  bookFileId: "f1",
  relativePath: "folder/book.epub",
  bytes: Buffer.from("edition-one"),
  koPartialMd5: ko,
});

describe("Phase05 canonical byte identity", () => {
  it("does not imply entitlement or title identity", () => {
    expect(one.entitlementVerified).toBe(false);
    expect(one.fingerprintAlgorithm).toBe("SHA256_FULL_BYTES");
    expect(one.byteLength).toBe(11);
    expect(
      resolveExactBookFile([one], {
        koPartialMd5: ko,
        expectedSha256: one.fingerprint,
        bookFileId: "f1",
      }),
    ).toEqual(one);
  });
  it("rejects traversal, guessed missing KO digest and mismatched edition", () => {
    expect(() =>
      fingerprintBookFile({
        bookId: "b1",
        bookFileId: "f1",
        relativePath: "../book.epub",
        bytes: Buffer.from("data"),
      }),
    ).toThrow();
    expect(() =>
      resolveExactBookFile([one], {
        koPartialMd5: ko,
        expectedSha256: "f".repeat(64),
        bookFileId: "f1",
      }),
    ).toThrow("IDENTITY_EDITION_MISMATCH");
    expect(() =>
      resolveExactBookFile([one], {
        koPartialMd5: "b".repeat(32),
        expectedSha256: one.fingerprint,
        bookFileId: "f1",
      }),
    ).toThrow("IDENTITY_MISSING_OR_COLLISION");
  });
  it("rejects different-byte titles colliding on KO hash rather than choosing a file", () => {
    const two = fingerprintBookFile({
      bookId: "b2",
      bookFileId: "f2",
      relativePath: "another/book.epub",
      bytes: Buffer.from("edition-two"),
      koPartialMd5: ko,
    });
    expect(() =>
      resolveExactBookFile([one, two], {
        koPartialMd5: ko,
        expectedSha256: one.fingerprint,
        bookFileId: "f1",
      }),
    ).toThrow("IDENTITY_MISSING_OR_COLLISION");
  });
});
