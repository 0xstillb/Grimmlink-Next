import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { COMPATIBILITY_MANIFEST, COMPATIBILITY_MANIFEST_SHA256 } from "./compatibility-manifest.js";

it("keeps the published Phase08 compatibility manifest equal to the owner-review baseline", () => {
  const json = JSON.parse(
    readFileSync(
      new URL("../../../docs/implementation/phase-08/COMPATIBILITY-MANIFEST.json", import.meta.url),
      "utf8",
    ),
  ) as unknown;
  expect(json).toEqual(COMPATIBILITY_MANIFEST);
  expect(COMPATIBILITY_MANIFEST_SHA256).toBe(
    createHash("sha256").update(JSON.stringify(json), "utf8").digest("hex"),
  );
});
