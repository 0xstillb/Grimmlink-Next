import { it, expect } from "vitest";
import { planReadOnlyLocation } from "./index.js";
it("rejects absolute and dot traversal", () => {
  expect(() => planReadOnlyLocation("../secret")).toThrow();
  expect(() => planReadOnlyLocation("/root")).toThrow();
  expect(planReadOnlyLocation("library/book.opf").access).toBe("UNVERIFIED_READ_ONLY");
});
