import { createHash } from "node:crypto";
import {
  buildMetadataBundle,
  verifyMetadataBundle,
  type MetadataBundle,
  type MetadataSnapshot,
} from "./backup-bundle.js";

type MockRecord = Readonly<{
  bookId: string;
  metadata: Readonly<Record<string, string | number>>;
  revision: number;
}>;
export type MockRestorePreview = Readonly<{
  action: "PREVIEW_THEN_EXPLICIT_CONFIRM";
  bundleHash: string;
  ownerId: string;
  token: string;
  bookIds: readonly string[];
  coverApply: "SEPARATE_DISABLED";
  writesAllowed: false;
}>;
export type MockRestoreOutcome = Readonly<{
  state: "VERIFIED" | "FAILED" | "UNKNOWN";
  code: string;
  verifiedBookIds: readonly string[];
  officialConnected: false;
  scope: "ISOLATED_MEMORY_FAKE";
}>;
function sha(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
function validOwner(value: string): boolean {
  return /^[A-Za-z0-9_-]{1,120}$/.test(value);
}
function cloneRecord(snapshot: MetadataSnapshot, revision = 1): MockRecord {
  const normalized = buildMetadataBundle([snapshot], 0).snapshots[0]!;
  return { bookId: normalized.bookId, metadata: { ...normalized.metadata }, revision };
}
export function createIsolatedMockRestore(
  initial: readonly MetadataSnapshot[],
  canonicalOwnerId: string,
) {
  if (!validOwner(canonicalOwnerId)) throw new Error("Invalid mock owner");
  const rows = new Map<string, MockRecord>();
  for (const snapshot of initial) {
    const record = cloneRecord(snapshot);
    if (rows.has(record.bookId)) throw new Error("Duplicate fake record");
    rows.set(record.bookId, record);
  }
  const deliveries = new Map<
    string,
    { bundleHash: string; ownerId: string; result: MockRestoreOutcome }
  >();
  const preimage = (bundle: MetadataBundle) =>
    bundle.snapshots.map((s) => {
      const row = rows.get(s.bookId);
      if (!row) throw new Error("Fake Official book not found");
      return { id: s.bookId, revision: row.revision, currentHash: sha(row.metadata) };
    });
  function preview(bundle: MetadataBundle, ownerId: string): MockRestorePreview {
    if (ownerId !== canonicalOwnerId) throw new Error("Mock owner rejected");
    const checked = verifyMetadataBundle(bundle);
    const before = preimage(checked);
    const token = sha({ ownerId, bundleHash: checked.sha256, before });
    return Object.freeze({
      action: "PREVIEW_THEN_EXPLICIT_CONFIRM",
      bundleHash: checked.sha256,
      ownerId,
      token,
      bookIds: Object.freeze(checked.snapshots.map((s) => s.bookId)),
      coverApply: "SEPARATE_DISABLED",
      writesAllowed: false,
    });
  }
  function readback(bookId: string): MockRecord | null {
    const record = rows.get(bookId);
    return record
      ? { bookId: record.bookId, metadata: { ...record.metadata }, revision: record.revision }
      : null;
  }
  function reconciledReadback(bundle: MetadataBundle): boolean {
    const checked = verifyMetadataBundle(bundle);
    return checked.snapshots.every((s) => sha(rows.get(s.bookId)?.metadata) === sha(s.metadata));
  }
  function confirm(
    bundle: MetadataBundle,
    approved: MockRestorePreview,
    ownerConfirmed: boolean,
    idempotencyKey: string,
    fault: "NONE" | "OFFICIAL_OFFLINE" | "UNKNOWN_AFTER_APPLY" | "READBACK_MISMATCH" = "NONE",
  ): MockRestoreOutcome {
    if (!ownerConfirmed || !validOwner(approved.ownerId) || approved.ownerId !== canonicalOwnerId)
      throw new Error("Owner confirmation required");
    if (!/^[A-Za-z0-9:_-]{1,120}$/.test(idempotencyKey))
      throw new Error("Invalid confirmation idempotency key");
    const checked = verifyMetadataBundle(bundle);
    if (checked.sha256 !== approved.bundleHash) throw new Error("Bundle confirmation mismatch");
    const previousDelivery = deliveries.get(idempotencyKey);
    if (previousDelivery) {
      if (
        previousDelivery.bundleHash !== checked.sha256 ||
        previousDelivery.ownerId !== approved.ownerId
      )
        throw new Error("Restore idempotency key conflicts with approved bundle");
      return previousDelivery.result; // UNKNOWN never automatically re-applied
    }
    const current = preview(checked, approved.ownerId);
    if (current.token !== approved.token)
      throw new Error("Stale Official revision or preview token");
    const make = (
      state: MockRestoreOutcome["state"],
      code: string,
      ids: readonly string[],
    ): MockRestoreOutcome =>
      Object.freeze({
        state,
        code,
        verifiedBookIds: Object.freeze([...ids]),
        officialConnected: false,
        scope: "ISOLATED_MEMORY_FAKE",
      });
    if (fault === "OFFICIAL_OFFLINE") {
      const failed = make("FAILED", "OFFICIAL_OFFLINE_BEFORE_DISPATCH", []);
      deliveries.set(idempotencyKey, {
        bundleHash: checked.sha256,
        ownerId: approved.ownerId,
        result: failed,
      });
      return failed;
    }
    for (const snapshot of checked.snapshots) {
      const previous = rows.get(snapshot.bookId)!;
      rows.set(snapshot.bookId, {
        bookId: snapshot.bookId,
        metadata: { ...snapshot.metadata },
        revision: previous.revision + 1,
      });
    }
    if (fault === "UNKNOWN_AFTER_APPLY") {
      const unknown = make("UNKNOWN", "OUTCOME_UNKNOWN_NO_AUTO_RETRY", []);
      deliveries.set(idempotencyKey, {
        bundleHash: checked.sha256,
        ownerId: approved.ownerId,
        result: unknown,
      });
      return unknown;
    }
    const matching = reconciledReadback(checked);
    if (!matching || fault === "READBACK_MISMATCH") {
      const unknown = make("UNKNOWN", "FAKE_HTTP_200_READBACK_MISMATCH", []);
      deliveries.set(idempotencyKey, {
        bundleHash: checked.sha256,
        ownerId: approved.ownerId,
        result: unknown,
      });
      return unknown;
    }
    const verified = make(
      "VERIFIED",
      "FAKE_CAS_AND_READBACK_MATCH",
      checked.snapshots.map((s) => s.bookId),
    );
    deliveries.set(idempotencyKey, {
      bundleHash: checked.sha256,
      ownerId: approved.ownerId,
      result: verified,
    });
    return verified;
  }
  function reconcile(bundle: MetadataBundle, idempotencyKey: string): MockRestoreOutcome {
    const pending = deliveries.get(idempotencyKey);
    if (!pending || pending.result.state !== "UNKNOWN" || pending.bundleHash !== bundle.sha256)
      throw new Error("Only uncertain mock confirmations can reconcile");
    const checked = verifyMetadataBundle(bundle);
    const success = reconciledReadback(checked);
    const result: MockRestoreOutcome = Object.freeze({
      state: success ? "VERIFIED" : "UNKNOWN",
      code: success ? "FAKE_READBACK_RECONCILED" : "STILL_UNKNOWN",
      verifiedBookIds: success ? checked.snapshots.map((s) => s.bookId) : [],
      officialConnected: false,
      scope: "ISOLATED_MEMORY_FAKE",
    });
    deliveries.set(idempotencyKey, { ...pending, result });
    return result;
  }
  function backupCurrent(ownerId: string, createdAt: number): MetadataBundle {
    if (ownerId !== canonicalOwnerId) throw new Error("Mock owner rejected");
    return buildMetadataBundle(
      Array.from(rows.values(), (r) => ({ bookId: r.bookId, metadata: { ...r.metadata } })),
      createdAt,
    );
  }
  return Object.freeze({ preview, confirm, reconcile, readback, backupCurrent });
}
