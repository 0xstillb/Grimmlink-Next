import { expect, it } from "vitest";
import { previewOfflineKoreaderRating, recoverOfflineKoreaderRating } from "./rating.js";
import { validateOfflinePersonalValue } from "./index.js";

const identity = {
  ownerId: "owner",
  bookId: "book",
  bookFileId: "file",
  editionSha256: "a".repeat(64),
};

it("preserves each original KOReader score in an offline receipt", () => {
  for (let score = 1; score <= 10; score++) {
    const receipt = previewOfflineKoreaderRating(identity, score);
    expect(receipt.officialScore).toBe(Math.ceil(score / 2));
    expect(receipt.writesAllowed).toBe(false);
    expect(recoverOfflineKoreaderRating(identity, receipt.officialScore, receipt)).toEqual({
      status: "RECEIPT_MATCH",
      koreaderScore: score,
    });
  }
  for (const score of [0, 11, 1.5, NaN])
    expect(() => previewOfflineKoreaderRating(identity, score)).toThrow("PHASE07_RATING_INVALID");
});

it("does not reconstruct a half-star without matching identity and receipt", () => {
  const receipt = previewOfflineKoreaderRating(identity, 3);
  const unresolved = { status: "UNRESOLVED", koreaderScore: null };
  expect(recoverOfflineKoreaderRating(identity, 2, null)).toEqual(unresolved);
  expect(recoverOfflineKoreaderRating({ ...identity, bookFileId: "other" }, 2, receipt)).toEqual(
    unresolved,
  );
  expect(
    recoverOfflineKoreaderRating({ ...identity, editionSha256: "b".repeat(64) }, 2, receipt),
  ).toEqual(unresolved);
  expect(recoverOfflineKoreaderRating(identity, 3, receipt)).toEqual(unresolved);
  expect(
    recoverOfflineKoreaderRating(identity, 2, { ...receipt, identity: null } as never),
  ).toEqual(unresolved);
});

it("accepts a native KOReader XPointer without asserting a mapped CFI", () => {
  const nativePosition = "/body/DocFragment[3]/body/p[3]/text().5";
  expect(validateOfflinePersonalValue({ kind: "BOOKMARK", nativePosition, label: "" })).toEqual({
    kind: "BOOKMARK",
    nativePosition,
    label: "",
  });
  expect(() =>
    validateOfflinePersonalValue({ kind: "BOOKMARK", nativePosition: "/body/<script>", label: "" }),
  ).toThrow();
});
