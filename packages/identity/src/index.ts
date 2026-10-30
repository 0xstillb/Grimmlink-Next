export type IdentityEvidence = Readonly<{
  source: "GRIMMORY_OFFICIAL";
  bookIdCandidate: string;
  editionDigest: string | null;
  currentUserEntitlementVerified: false;
}>;
/** Identity is not an ACL grant; Phase05 must independently resolve current rights. */
export function recordUnverifiedIdentity(bookId: string): IdentityEvidence {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(bookId)) throw new Error("Invalid book id");
  return Object.freeze({
    source: "GRIMMORY_OFFICIAL",
    bookIdCandidate: bookId,
    editionDigest: null,
    currentUserEntitlementVerified: false,
  });
}
export * from "./phase05.js";
