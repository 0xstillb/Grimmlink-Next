import { it, expect } from "vitest";
import { nextLocalJobState } from "./index.js";
it("fails illegal transitions", () => {
  expect(nextLocalJobState("PENDING", "CLAIM")).toBe("LEASED");
  expect(() => nextLocalJobState("DONE", "CLAIM")).toThrow();
});
