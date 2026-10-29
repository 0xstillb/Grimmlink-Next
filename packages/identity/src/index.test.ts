import { it, expect } from "vitest"; import { recordUnverifiedIdentity } from "./index.js";
it("does not equate book identity with content entitlement", () => { expect(recordUnverifiedIdentity("book_01").currentUserEntitlementVerified).toBe(false); expect(() => recordUnverifiedIdentity("../secret")).toThrow(); });
