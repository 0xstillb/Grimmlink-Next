import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import Database from "better-sqlite3";
import { expect, it } from "vitest";
import { pairOfflineReader, revokeOfflineReader } from "./phase05-devices.js";
import { recordOfflinePhase07Session, registerOfflinePhase07File } from "./phase07-personal.js";

it("replays current and legacy session receipts at a later server time without changing duration", () => {
  const sqlite = new Database(":memory:");
  try {
    const folder = new URL("../migrations/", import.meta.url);
    for (const name of readdirSync(folder)
      .filter((x) => x.endsWith(".sql"))
      .sort())
      sqlite.exec(readFileSync(new URL(name, folder), "utf8"));
    const owner = { kind: "verified-owner-fixture" as const, accountId: "owner" };
    const file = { bookId: "book", bookFileId: "file", editionSha256: "a".repeat(64) };
    const paired = pairOfflineReader(sqlite, owner, "reader", 100, 10000);
    registerOfflinePhase07File(sqlite, owner, file);
    const start = {
      ownerId: "owner",
      deviceId: "reader",
      token: paired.token,
      file,
      sessionId: "session",
      eventId: "start",
      action: "START" as const,
      expectedRevision: 0,
      nowMs: 200,
    };
    expect(recordOfflinePhase07Session(sqlite, start).revision).toBe(1);
    expect(recordOfflinePhase07Session(sqlite, { ...start, nowMs: 250 }).revision).toBe(1);
    const legacyHash = createHash("sha256")
      .update(JSON.stringify(["owner", "reader", file, "session", "start", "START", 0, 200]))
      .digest("hex");
    sqlite
      .prepare("UPDATE phase07_session_events SET payload_sha256=? WHERE event_id='start'")
      .run(legacyHash);
    expect(recordOfflinePhase07Session(sqlite, { ...start, nowMs: 300 }).revision).toBe(1);
    expect(() =>
      recordOfflinePhase07Session(sqlite, { ...start, action: "STOP", nowMs: 300 }),
    ).toThrow("PHASE07_SESSION_REPLAY_COLLISION");
    const stop = {
      ...start,
      eventId: "stop",
      action: "STOP" as const,
      expectedRevision: 1,
      nowMs: 400,
    };
    expect(recordOfflinePhase07Session(sqlite, stop).revision).toBe(2);
    expect(recordOfflinePhase07Session(sqlite, { ...stop, nowMs: 800 }).revision).toBe(2);
    expect(
      sqlite
        .prepare("SELECT started_at,ended_at FROM phase07_sessions WHERE session_id='session'")
        .get(),
    ).toEqual({ started_at: 200, ended_at: 400 });
    revokeOfflineReader(sqlite, owner, "reader", 900);
    expect(() => recordOfflinePhase07Session(sqlite, { ...stop, nowMs: 901 })).toThrow(
      "PHASE07_READER_REVOKED_OR_EXPIRED",
    );
  } finally {
    sqlite.close();
  }
});
