import { expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { openLocalStore } from "./index.js";
import { pairOfflineReader, revokeOfflineReader } from "./phase05-devices.js";
import {
  previewOfflinePhase07Shelf,
  readOfflinePhase07Personal,
  readOfflinePhase07Session,
  recordOfflinePhase07Personal,
  recordOfflinePhase07Session,
  registerOfflinePhase07File,
} from "./phase07-personal.js";

const migrations = resolve(fileURLToPath(new URL("../migrations", import.meta.url)));
const owner = { kind: "verified-owner-fixture" as const, accountId: "one_owner" };
const foreign = { kind: "verified-owner-fixture" as const, accountId: "other_owner" };
const epub = { bookId: "book1", bookFileId: "epub1", editionSha256: "a".repeat(64) };
const another = { bookId: "book2", bookFileId: "epub2", editionSha256: "b".repeat(64) };
const bookmark = {
  kind: "BOOKMARK",
  nativePosition: "epubcfi(/6/2[chapter]!/4/2:0)",
  label: "Page one",
};
const annotation = {
  kind: "ANNOTATION",
  nativePosition: "epubcfi(/6/2[chapter]!/4/2:2)",
  quote: "ข้อความอ่าน",
  note: "จดบันทึก",
};

it("enforces record CAS, replay, deletion tombstones and restart durability", () => {
  const dir = mkdtempSync(join(tmpdir(), "phase07-records-"));
  try {
    const file = join(dir, "local.sqlite");
    let store = openLocalStore(file, migrations);
    const first = pairOfflineReader(store.sqlite, owner, "reader_a", 100, 30000);
    const second = pairOfflineReader(store.sqlite, owner, "reader_b", 100, 30000);
    registerOfflinePhase07File(store.sqlite, owner, epub);
    const put = {
      ownerId: owner.accountId,
      deviceId: "reader_a",
      token: first.token,
      file: epub,
      eventId: "rating1",
      kind: "RATING" as const,
      recordId: "rating",
      expectedRevision: 0,
      action: "UPSERT" as const,
      value: { kind: "RATING", score: 4 },
      nowMs: 200,
    };
    expect(recordOfflinePhase07Personal(store.sqlite, put)).toEqual({
      status: "LOCAL_RECORDED",
      revision: 1,
    });
    expect(recordOfflinePhase07Personal(store.sqlite, put)).toEqual({
      status: "LOCAL_RECORDED",
      revision: 1,
    });
    expect(
      recordOfflinePhase07Personal(store.sqlite, {
        ...put,
        eventId: "rating_stale",
        deviceId: "reader_b",
        token: second.token,
        value: { kind: "RATING", score: 5 },
      }),
    ).toEqual({ status: "CONFLICT", revision: 1 });
    expect(() =>
      recordOfflinePhase07Personal(store.sqlite, {
        ...put,
        value: { kind: "RATING", score: 5 },
      }),
    ).toThrow("PHASE07_PERSONAL_REPLAY_COLLISION");
    expect(() =>
      recordOfflinePhase07Personal(store.sqlite, {
        ...put,
        eventId: "bad_rating",
        value: { kind: "RATING", score: 6 },
      }),
    ).toThrow("PHASE07_PERSONAL_VALUE_INVALID");
    const note = {
      ...put,
      eventId: "note1",
      kind: "ANNOTATION" as const,
      recordId: "note1",
      value: annotation,
    };
    const mark = {
      ...put,
      eventId: "mark1",
      kind: "BOOKMARK" as const,
      recordId: "mark1",
      value: bookmark,
    };
    expect(recordOfflinePhase07Personal(store.sqlite, note).status).toBe("LOCAL_RECORDED");
    expect(recordOfflinePhase07Personal(store.sqlite, mark).revision).toBe(1);
    expect(
      recordOfflinePhase07Personal(store.sqlite, {
        ...mark,
        eventId: "delete_mark",
        action: "DELETE",
        value: null,
        expectedRevision: 1,
      }),
    ).toEqual({ status: "LOCAL_RECORDED", revision: 2 });
    expect(() =>
      recordOfflinePhase07Personal(store.sqlite, {
        ...put,
        eventId: "reset_rating",
        action: "DELETE",
        value: null,
        expectedRevision: 1,
      }),
    ).toThrow("PHASE07_PERSONAL_EVENT_INVALID");
    store.close();
    store = openLocalStore(file, migrations);
    const read = (kind: "RATING" | "BOOKMARK", recordId: string) =>
      readOfflinePhase07Personal(store.sqlite, {
        ownerId: owner.accountId,
        deviceId: "reader_b",
        token: second.token,
        file: epub,
        kind,
        recordId,
        nowMs: 501,
      });
    expect(read("RATING", "rating")).toEqual({
      revision: 1,
      deleted: false,
      value: { kind: "RATING", score: 4 },
    });
    expect(read("BOOKMARK", "mark1")).toEqual({ revision: 2, deleted: true, value: null });
    expect(() =>
      readOfflinePhase07Personal(store.sqlite, {
        ownerId: owner.accountId,
        deviceId: "reader_b",
        token: second.token,
        file: { ...epub, editionSha256: "c".repeat(64) },
        kind: "RATING",
        recordId: "rating",
        nowMs: 501,
      }),
    ).toThrow("PHASE07_FILE_EDITION_MISMATCH");
    expect(() => registerOfflinePhase07File(store.sqlite, foreign, another)).toThrow(
      "PHASE07_OWNER_MISMATCH",
    );
    revokeOfflineReader(store.sqlite, owner, "reader_b", 502);
    expect(() => read("RATING", "rating")).toThrow("PHASE07_READER_REVOKED_OR_EXPIRED");
    store.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

it("keeps reading sessions bounded, idempotent, device-locked and server-clock sourced", () => {
  const dir = mkdtempSync(join(tmpdir(), "phase07-sessions-"));
  try {
    const store = openLocalStore(join(dir, "local.sqlite"), migrations);
    const pair = pairOfflineReader(store.sqlite, owner, "reader", 100, 200000000);
    const other = pairOfflineReader(store.sqlite, owner, "tablet", 100, 200000000);
    registerOfflinePhase07File(store.sqlite, owner, epub);
    const start = {
      ownerId: owner.accountId,
      deviceId: "reader",
      token: pair.token,
      file: epub,
      sessionId: "session1",
      eventId: "start1",
      action: "START" as const,
      expectedRevision: 0,
      nowMs: 1000,
      clientTimestamp: 99999999,
    };
    expect(recordOfflinePhase07Session(store.sqlite, start)).toEqual({
      status: "LOCAL_RECORDED",
      revision: 1,
    });
    expect(recordOfflinePhase07Session(store.sqlite, start).revision).toBe(1);
    expect(recordOfflinePhase07Session(store.sqlite, { ...start, nowMs: 1001 })).toEqual({
      status: "LOCAL_RECORDED",
      revision: 1,
    });
    expect(() =>
      recordOfflinePhase07Session(store.sqlite, { ...start, action: "STOP", nowMs: 1001 }),
    ).toThrow("PHASE07_SESSION_REPLAY_COLLISION");
    const stop = {
      ...start,
      eventId: "stop1",
      action: "STOP" as const,
      expectedRevision: 1,
      nowMs: 1125,
      clientTimestamp: 0,
    };
    expect(() =>
      recordOfflinePhase07Session(store.sqlite, {
        ...stop,
        deviceId: "tablet",
        token: other.token,
      }),
    ).toThrow("PHASE07_SESSION_IDENTITY_MISMATCH");
    expect(recordOfflinePhase07Session(store.sqlite, stop)).toEqual({
      status: "LOCAL_RECORDED",
      revision: 2,
    });
    expect(recordOfflinePhase07Session(store.sqlite, stop).revision).toBe(2);
    expect(recordOfflinePhase07Session(store.sqlite, { ...stop, nowMs: 1300 }).revision).toBe(2);
    expect(
      readOfflinePhase07Session(store.sqlite, {
        ownerId: owner.accountId,
        deviceId: "tablet",
        token: other.token,
        file: epub,
        sessionId: "session1",
        nowMs: 1200,
      }),
    ).toEqual({
      mode: "LOCAL_PREVIEW_ONLY",
      deviceId: "reader",
      startedAtMs: 1000,
      endedAtMs: 1125,
      durationMs: 125,
      revision: 2,
    });
    expect(
      recordOfflinePhase07Session(store.sqlite, {
        ...stop,
        eventId: "stop_twice",
      }),
    ).toEqual({ status: "CONFLICT", revision: 2 });
    const longSession = {
      ...start,
      eventId: "long_start",
      sessionId: "long",
      nowMs: 3000,
    };
    recordOfflinePhase07Session(store.sqlite, longSession);
    expect(() =>
      recordOfflinePhase07Session(store.sqlite, {
        ...longSession,
        action: "STOP",
        eventId: "long_end",
        expectedRevision: 1,
        nowMs: 3000 + 25 * 3600 * 1000,
      }),
    ).toThrow("PHASE07_SESSION_DURATION_INVALID");
    store.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

it("manual shelf preview validates every owner/file/edition and has no side effects", () => {
  const dir = mkdtempSync(join(tmpdir(), "phase07-shelf-"));
  try {
    const store = openLocalStore(join(dir, "local.sqlite"), migrations);
    const pair = pairOfflineReader(store.sqlite, owner, "reader", 100, 9000);
    registerOfflinePhase07File(store.sqlite, owner, epub);
    registerOfflinePhase07File(store.sqlite, owner, another);
    const request = {
      ownerId: owner.accountId,
      deviceId: "reader",
      token: pair.token,
      nowMs: 200,
      trigger: "MANUAL_OWNER_ACTION" as const,
      known: [epub],
      selected: [another],
    };
    expect(previewOfflinePhase07Shelf(store.sqlite, request)).toEqual({
      mode: "MANUAL_PREVIEW_ONLY",
      add: ["epub2"],
      remove: ["epub1"],
      unchanged: [],
    });
    expect(() =>
      previewOfflinePhase07Shelf(store.sqlite, { ...request, trigger: "AUTO" as never }),
    ).toThrow("PHASE07_MANUAL_SHELF_REQUIRED");
    expect(() =>
      previewOfflinePhase07Shelf(store.sqlite, { ...request, selected: [another, another] }),
    ).toThrow("PHASE07_DUPLICATE_SHELF_FILE");
    expect(() =>
      previewOfflinePhase07Shelf(store.sqlite, {
        ...request,
        selected: [{ ...another, editionSha256: "f".repeat(64) }],
      }),
    ).toThrow("PHASE07_FILE_EDITION_MISMATCH");
    expect(
      store.sqlite.prepare("SELECT COUNT(*) AS n FROM phase07_personal_records").get(),
    ).toEqual({ n: 0 });
    store.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
