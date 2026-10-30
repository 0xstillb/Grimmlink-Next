import { expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { openLocalStore } from "./index.js";
import {
  pairOfflineReader,
  rotateOfflineReader,
  listOfflineReaders,
  readOfflinePosition,
  recordOfflinePosition,
  registerOfflineSyncDocument,
  revokeOfflineReader,
  switchOfflineWriter,
  verifyOfflineReader,
} from "./phase05-devices.js";

const migrations = resolve(fileURLToPath(new URL("../migrations", import.meta.url)));
const owner = { kind: "verified-owner-fixture" as const, accountId: "my_owner" };
const foreign = { kind: "verified-owner-fixture" as const, accountId: "foreign" };
const doc = "a".repeat(32);
const sha = "b".repeat(64);

it("pairs multiple same-owner devices with restart durability, expiry and immediate revocation", () => {
  const dir = mkdtempSync(join(tmpdir(), "phase05-pair-"));
  try {
    const file = join(dir, "local.sqlite");
    let store = openLocalStore(file, migrations);
    const a = pairOfflineReader(store.sqlite, owner, "koreader", 100, 10000);
    const b = pairOfflineReader(store.sqlite, owner, "x4", 100, 10000);
    expect(a.token).not.toBe(b.token);
    expect(verifyOfflineReader(store.sqlite, owner.accountId, "koreader", a.token, 101)).toBe(true);
    expect(verifyOfflineReader(store.sqlite, owner.accountId, "koreader", b.token, 101)).toBe(
      false,
    );
    expect(verifyOfflineReader(store.sqlite, owner.accountId, "koreader", a.token, 10000)).toBe(
      false,
    );
    expect(() => pairOfflineReader(store.sqlite, foreign, "intruder", 100, 10000)).toThrow(
      "OWNER_MISMATCH",
    );
    store.close();
    store = openLocalStore(file, migrations);
    expect(verifyOfflineReader(store.sqlite, owner.accountId, "x4", b.token, 200)).toBe(true);
    revokeOfflineReader(store.sqlite, owner, "x4", 200);
    expect(verifyOfflineReader(store.sqlite, owner.accountId, "x4", b.token, 200)).toBe(false);
    expect(verifyOfflineReader(store.sqlite, owner.accountId, "koreader", a.token, 200)).toBe(true);
    store.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

it("rotates an active device atomically and never exposes its token in owner listings", () => {
  const dir = mkdtempSync(join(tmpdir(), "phase05-rotate-"));
  try {
    const store = openLocalStore(join(dir, "local.sqlite"), migrations);
    const first = pairOfflineReader(store.sqlite, owner, "tablet", 100, 2000);
    const next = rotateOfflineReader(store.sqlite, owner, "tablet", 200, 3000);
    expect(next.generation).toBe(2);
    expect(next.token).not.toBe(first.token);
    expect(verifyOfflineReader(store.sqlite, owner.accountId, "tablet", first.token, 201)).toBe(false);
    expect(verifyOfflineReader(store.sqlite, owner.accountId, "tablet", next.token, 201)).toBe(true);
    const list = listOfflineReaders(store.sqlite, owner);
    expect(list).toEqual([{ deviceId: "tablet", generation: 2, expiresAtMs: 3000, revokedAtMs: null }]);
    expect(JSON.stringify(list)).not.toContain("token");
    expect(() => listOfflineReaders(store.sqlite, foreign)).toThrow("OWNER_MISMATCH");
    expect(() => rotateOfflineReader(store.sqlite, foreign, "tablet", 202, 4000)).toThrow("OWNER_MISMATCH");
    revokeOfflineReader(store.sqlite, owner, "tablet", 203);
    expect(() => rotateOfflineReader(store.sqlite, owner, "tablet", 204, 4000)).toThrow("ROTATION_NOT_ACTIVE");
    store.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

it("never enables Native writer, blocks drift, and resolves mock CAS/replay without client clock", () => {
  const dir = mkdtempSync(join(tmpdir(), "phase05-sync-"));
  try {
    const store = openLocalStore(join(dir, "local.sqlite"), migrations);
    const pair = pairOfflineReader(store.sqlite, owner, "reader", 100, 10000);
    registerOfflineSyncDocument(store.sqlite, owner, {
      koPartialMd5: doc,
      bookFileId: "file1",
      editionSha256: sha,
    });
    expect(() =>
      registerOfflineSyncDocument(store.sqlite, owner, {
        koPartialMd5: doc,
        bookFileId: "file2",
        editionSha256: sha,
      }),
    ).toThrow("SYNC_HASH_COLLISION_OR_EDITION_DRIFT");
    expect(() =>
      switchOfflineWriter(store.sqlite, owner, doc, 0, "NATIVE" as never, {
        noInflightWrites: true,
        observedRevision: 0,
      }),
    ).toThrow();
    expect(
      switchOfflineWriter(store.sqlite, owner, doc, 0, "MOCK_MANAGED", {
        noInflightWrites: true,
        observedRevision: 0,
      }),
    ).toBe(1);
    const event = {
      ownerId: owner.accountId,
      deviceId: "reader",
      token: pair.token,
      documentHash: doc,
      bookFileId: "file1",
      editionSha256: sha,
      eventId: "evt1",
      position: "opaque native xpointer: position A",
      expectedRevision: 1,
      nowMs: 200,
      clientTimestamp: 9999999999,
    };
    expect(recordOfflinePosition(store.sqlite, event)).toEqual({
      state: "LOCAL_RECORDED",
      revision: 2,
    });
    expect(recordOfflinePosition(store.sqlite, event)).toEqual({
      state: "LOCAL_RECORDED",
      revision: 2,
    });
    expect(
      recordOfflinePosition(store.sqlite, {
        ...event,
        eventId: "evt2",
        position: "old client",
        clientTimestamp: 99999999999,
      }),
    ).toEqual({ state: "CONFLICT", revision: 2 });
    expect(
      readOfflinePosition(store.sqlite, owner.accountId, "reader", pair.token, doc, 201),
    ).toEqual({ position: event.position, revision: 2 });
    expect(() =>
      recordOfflinePosition(store.sqlite, {
        ...event,
        position: "changed replay",
      }),
    ).toThrow("SYNC_EVENT_IDEMPOTENCY_CONFLICT");
    expect(() =>
      switchOfflineWriter(store.sqlite, owner, doc, 1, "DISABLED", {
        noInflightWrites: true,
        observedRevision: 1,
      }),
    ).toThrow("SYNC_SWITCH_STALE");
    revokeOfflineReader(store.sqlite, owner, "reader", 201);
    expect(() =>
      readOfflinePosition(store.sqlite, owner.accountId, "reader", pair.token, doc, 201),
    ).toThrow("SYNC_READER_REVOKED_OR_EXPIRED");
    store.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
