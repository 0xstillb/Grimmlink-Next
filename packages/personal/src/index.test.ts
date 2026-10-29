import { it, expect } from "vitest";
import { personalWriteCapability, assertPersonalWriteAuthorized } from "./index.js";
it("refuses personal writes", () => {
  expect(Object.values(personalWriteCapability).every((x) => !x)).toBe(true);
  expect(assertPersonalWriteAuthorized).toThrow();
});
