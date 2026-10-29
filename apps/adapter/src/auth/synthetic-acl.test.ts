import { describe, expect, it } from "vitest";
import { checkSyntheticBatch, type ResourceClaim, type RightsSnapshot } from "./synthetic-acl.js";
import type { VerifiedActor } from "./policy.js";

const actor: VerifiedActor = {
  kind: "reader", accountId: "reader1", deviceId: "device1", expiresAtMs: 100000,
};
const claim: ResourceClaim = {
  accountId: "reader1", libraryId: "library1", bookId: "book1",
  fileId: "file1", recordId: "record1",
};
const rights: RightsSnapshot = {
  accountId: "reader1", libraryId: "library1", bookId: "book1",
  fileIds: ["file1"], recordIds: ["record1"], current: true, revoked: false,
};
const testAcl = (
  c: ResourceClaim = claim, s: RightsSnapshot | null = rights,
  a: VerifiedActor | null = actor,
) => checkSyntheticBatch(a, [c], [s], 50000);

describe("Phase02 synthetic current-rights all-or-none policy", () => {
  it("recognizes a valid synthetic match without granting live forwarding", () => {
    expect(testAcl()).toBe("ALLOW_MOCK_ONLY");
  });
  it.each([
    ["foreign user", { ...claim, accountId: "other" }, rights],
    ["foreign library", { ...claim, libraryId: "other" }, rights],
    ["foreign book", { ...claim, bookId: "other" }, rights],
    ["cross-book file", { ...claim, fileId: "file2" }, rights],
    ["foreign record", { ...claim, recordId: "record2" }, rights],
    ["revoked", claim, { ...rights, revoked: true }],
    ["stale", claim, { ...rights, current: false }],
    ["missing", claim, null],
    ["wrong rights library", claim, { ...rights, libraryId: "other" }],
    ["wrong rights account", claim, { ...rights, accountId: "other" }],
    ["wrong rights book", claim, { ...rights, bookId: "other" }],
  ] as const)("denies %s synthetic fixture", (_label, c, s) => {
    expect(testAcl(c, s)).toBe("DENY_ALL");
  });
  it("refuses admin escalation and unauthenticated reads", () => {
    expect(testAcl(claim, rights, { ...actor, kind: "admin", csrfSha256: "a".repeat(64) } as VerifiedActor)).toBe("DENY_ALL");
    expect(testAcl(claim, rights, null)).toBe("DENY_ALL");
  });
  it("denies entire batch when ANY file or book is foreign, never partial authorizes", () => {
    const c2 = { ...claim, bookId: "book2", fileId: "foreign" };
    expect(checkSyntheticBatch(actor, [claim, c2], [rights, { ...rights, bookId: "book2" }], 50000)).toBe("DENY_ALL");
  });
  it("denies duplicate, empty and mismatched arrays", () => {
    expect(checkSyntheticBatch(actor, [claim, claim], [rights, rights], 50000)).toBe("DENY_ALL");
    expect(checkSyntheticBatch(actor, [], [], 50000)).toBe("INVALID_BATCH");
    expect(checkSyntheticBatch(actor, [claim], [], 50000)).toBe("INVALID_BATCH");
  });
  it("denies path aliases and malformed identifiers before matching", () => {
    expect(testAcl({ ...claim, fileId: "../file1" })).toBe("DENY_ALL");
    expect(testAcl({ ...claim, recordId: "%2e" })).toBe("DENY_ALL");
  });
});
