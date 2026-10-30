import { expect, it } from "vitest";
import { parseSidecarPreview, planManualSidecarImport, selectMetadataSource } from "./sidecar.js";
const bytes = (value: unknown) => Buffer.from(JSON.stringify(value));
it("parses modern/legacy Sidecar as OFF-only sparse metadata", () => {
  expect(
    parseSidecarPreview(
      bytes({ metadata: { title: " Book ", seriesNumber: 2, secret: "ignored" } }),
    ).metadata,
  ).toEqual({ title: "Book", seriesNumber: 2 });
  expect(parseSidecarPreview(bytes({ title: "Old" })).metadata.title).toBe("Old");
  expect(selectMetadataSource(true, true)).toBe("OPF_PRIMARY");
  expect(selectMetadataSource(false, false)).toBe("NONE");
  expect(selectMetadataSource(false, true)).toBe("SIDECAR_FALLBACK");
  const preview = parseSidecarPreview(bytes({ title: "Old" }));
  expect(() => planManualSidecarImport(preview, false)).toThrow("confirmation");
  expect(planManualSidecarImport(preview, true).writesAllowed).toBe(false);
});
it("fails closed for malformed and dangerous Sidecars", () => {
  for (const value of [
    { metadata: [] },
    { metadata: { title: 1 } },
    { seriesNumber: -3 },
    { title: "a".repeat(513) },
  ])
    expect(() => parseSidecarPreview(bytes(value))).toThrow();
  expect(() => parseSidecarPreview(Buffer.from([0xff, 0xfe]))).toThrow();
  expect(() => parseSidecarPreview(Buffer.alloc(1024 * 1024 + 1))).toThrow();
});
