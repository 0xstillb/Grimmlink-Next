import { describe, expect, it } from "vitest";
import { planOfflineMetadataUpdate } from "./metadata-plan.js";

const locks = {
  allMetadataLocked: false,
  title: false,
  subtitle: false,
  publisher: false,
  publishedDate: false,
  description: false,
  seriesName: false,
  seriesNumber: false,
  isbn13: false,
  isbn10: false,
  language: false,
};
const input = () => ({
  ownerId: "owner_1",
  bookId: "book_1",
  bookFileId: "file_1",
  mountId: "nas_1",
  editionSha256: "a".repeat(64),
  opfSha256: "b".repeat(64),
  fixtureRevision: "rev_1",
  source: { title: "New title", publisher: "New publisher", language: "th" },
  current: {
    title: "Old title",
    publisher: "Old publisher",
    language: "th",
    description: "Must survive",
  },
  locks: { ...locks, publisher: true },
  nowMs: 1000,
  expiresAtMs: 5000,
});

describe("Phase03 offline metadata plan", () => {
  it("previews only changed, unlocked scalars without clear flags or collections", () => {
    const original = input();
    const plan = planOfflineMetadataUpdate(original);
    expect(plan.evidence).toBe("OFFLINE_FIXTURE_ONLY");
    expect(plan.writesAllowed).toBe(false);
    expect(plan.changes).toEqual([{ field: "title", before: "Old title", after: "New title" }]);
    expect(plan.skippedLocked).toEqual(["publisher"]);
    expect(plan.requestPreview).toEqual({
      method: "PUT",
      path: "/api/v1/books/book_1/metadata",
      query: { replaceMode: "REPLACE_WHEN_PROVIDED", mergeCategories: false },
      body: { metadata: { title: "New title" } },
    });
    const fakeTargetAfterMerge = { ...original.current, ...plan.requestPreview!.body.metadata };
    expect(fakeTargetAfterMerge).toMatchObject({
      publisher: "Old publisher",
      description: "Must survive",
      language: "th",
    });
    original.source.title = "Changed after preview";
    expect(plan.requestPreview!.body.metadata.title).toBe("New title");
    expect(Object.isFrozen(plan.requestPreview!.body.metadata)).toBe(true);
  });

  it("omits the request if all changes are locked or absent", () => {
    const plan = planOfflineMetadataUpdate({
      ...input(),
      locks: { ...locks, allMetadataLocked: true },
    });
    expect(plan.requestPreview).toBeNull();
    expect(plan.changes).toEqual([]);
    expect(plan.skippedLocked).toEqual(["title", "publisher", "language"]);
  });

  it("binds the fingerprint to identity, hashes, locks, current data and expiry", () => {
    const a = input();
    const baseline = planOfflineMetadataUpdate(a).fingerprint;
    for (const changed of [
      { ...a, bookFileId: "file_2" },
      { ...a, opfSha256: "c".repeat(64) },
      { ...a, current: { ...a.current, title: "Someone else's edit" } },
      { ...a, locks: { ...a.locks, title: true } },
      { ...a, expiresAtMs: 6000 },
    ])
      expect(planOfflineMetadataUpdate(changed).fingerprint).not.toBe(baseline);
  });

  it("rejects collections, null/invalid scalars, incomplete locks and expired plans", () => {
    const a = input();
    expect(() =>
      planOfflineMetadataUpdate({ ...a, source: { title: "x", bookReviews: [] } as never }),
    ).toThrow("METADATA_SOURCE_FIELDS_INVALID");
    expect(() => planOfflineMetadataUpdate({ ...a, source: { title: null } as never })).toThrow(
      "METADATA_SOURCE_VALUE_INVALID",
    );
    expect(() =>
      planOfflineMetadataUpdate({ ...a, source: { title: undefined } as never }),
    ).toThrow("METADATA_SOURCE_VALUE_INVALID");
    expect(() => planOfflineMetadataUpdate({ ...a, current: { language: "th" } })).toThrow(
      "METADATA_CURRENT_VALUE_MISSING",
    );
    expect(() =>
      planOfflineMetadataUpdate({ ...a, source: { publishedDate: "2023-02-29" } }),
    ).toThrow("METADATA_SOURCE_VALUE_INVALID");
    expect(() => planOfflineMetadataUpdate({ ...a, source: { isbn13: "9780306406158" } })).toThrow(
      "METADATA_SOURCE_VALUE_INVALID",
    );
    expect(() => planOfflineMetadataUpdate({ ...a, locks: { title: false } as never })).toThrow(
      "METADATA_LOCKS_INCOMPLETE",
    );
    expect(() => planOfflineMetadataUpdate({ ...a, expiresAtMs: 1000 })).toThrow(
      "METADATA_FIXTURE_IDENTITY_INVALID",
    );
  });
});
