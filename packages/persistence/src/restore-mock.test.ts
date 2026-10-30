import { expect, it } from "vitest";
import { buildMetadataBundle } from "./backup-bundle.js";
import { createIsolatedMockRestore } from "./restore-mock.js";
const previous = { bookId: "book-1", metadata: { title: "Original" } };
const backup = buildMetadataBundle([{ bookId: "book-1", metadata: { title: "Restored" } }], 100);
it("requires owner preview, confirmation, fake CAS/readback and never touches Official", () => {
  const fake = createIsolatedMockRestore([previous], "owner");
  expect(() => fake.preview(backup, "other")).toThrow("owner");
  const preview = fake.preview(backup, "owner");
  expect(fake.backupCurrent("owner", 100).snapshots[0]?.metadata.title).toBe("Original");
  expect(preview.writesAllowed).toBe(false);
  expect(() => fake.confirm(backup, preview, false, "restore1")).toThrow("confirmation");
  const result = fake.confirm(backup, preview, true, "restore1");
  expect(result).toMatchObject({
    state: "VERIFIED",
    code: "FAKE_CAS_AND_READBACK_MATCH",
    officialConnected: false,
  });
  expect(fake.readback("book-1")?.metadata.title).toBe("Restored");
  expect(fake.confirm(backup, preview, true, "restore1")).toEqual(result);
  const different = buildMetadataBundle([{bookId:"book-1",metadata:{title:"Changed"}}],100);
  expect(() => fake.confirm(different, {...preview,bundleHash:different.sha256}, true,"restore1")).toThrow("conflicts");
  expect(() => fake.confirm(backup, preview, true, "different-key")).toThrow("Stale");
});
it("unknown post cannot be retried and must reconcile using verified fake readback", () => {
  const fake = createIsolatedMockRestore([previous], "owner"),
    preview = fake.preview(backup, "owner");
  expect(fake.confirm(backup, preview, true, "unknown", "UNKNOWN_AFTER_APPLY").state).toBe(
    "UNKNOWN",
  );
  expect(fake.confirm(backup, preview, true, "unknown").state).toBe("UNKNOWN");
  expect(fake.reconcile(backup, "unknown").state).toBe("VERIFIED");
});
it("before-dispatch offline and faux HTTP 200 with mismatched readback are not success", () => {
  const fake = createIsolatedMockRestore([previous], "owner"),
    preview = fake.preview(backup, "owner");
  expect(fake.confirm(backup, preview, true, "offline", "OFFICIAL_OFFLINE").state).toBe("FAILED");
  expect(fake.confirm(backup, preview, true, "different", "READBACK_MISMATCH").state).toBe(
    "UNKNOWN",
  );
});
