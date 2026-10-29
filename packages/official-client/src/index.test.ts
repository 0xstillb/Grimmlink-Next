import { it, expect } from "vitest";
import { createDisabledOfficialClient } from "./index.js";
it("never issues an upstream fetch", async () => {
  await expect(createDisabledOfficialClient().getBookMetadata("123")).rejects.toThrow(
    "not authorized",
  );
});
