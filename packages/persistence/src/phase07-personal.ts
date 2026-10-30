import { createHash } from "node:crypto";
import type Database from "better-sqlite3";
import { type OfflineOwner, verifyOfflineReader } from "./phase05-devices.js";

/**
 * Phase07 OFFLINE FIXTURE ONLY. Not an Official API, not an installed KOReader
 * plugin bridge, no network writes, no real owner-login authorization.
 */
const validId = (v: unknown): v is string =>
  typeof v === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(v);
const validSha = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{64}$/.test(v);
const validNumber = (v: unknown): v is number =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
const clean = (v: unknown, max: number, allowEmpty = false): v is string =>
  typeof v === "string" &&
  v.length <= max &&
  (allowEmpty || v.length > 0) &&
  !/[\u0000-\u001f\u007f]/.test(v);
const position = (v: unknown): v is string =>
  clean(v, 2048) &&
  (v.startsWith("epubcfi(/") || v.startsWith("xpointer(/")) &&
  v.endsWith(")") &&
  !/[<>%\\]/.test(v);
const digest = (parts: unknown[]): string =>
  createHash("sha256").update(JSON.stringify(parts), "utf8").digest("hex");

export type Phase07File = Readonly<{
  bookId: string;
  bookFileId: string;
  editionSha256: string;
}>;
export type Phase07Kind = "RATING" | "BOOKMARK" | "ANNOTATION";
export type Phase07Write = Readonly<{
  ownerId: string;
  deviceId: string;
  token: string;
  file: Phase07File;
  eventId: string;
  kind: Phase07Kind;
  recordId: string;
  expectedRevision: number;
  action: "UPSERT" | "DELETE";
  value: unknown;
  nowMs: number;
}>;
export type Phase07Result = Readonly<{
  status: "LOCAL_RECORDED" | "CONFLICT";
  revision: number;
}>;

function assertFile(file: Phase07File): void {
  if (!validId(file.bookId) || !validId(file.bookFileId) || !validSha(file.editionSha256))
    throw new Error("PHASE07_FILE_INVALID");
}

function assertOwner(sqlite: Database.Database, ownerId: string): void {
  const row = sqlite.prepare("SELECT owner_id FROM single_owner WHERE slot=1").get() as
    | { owner_id: string }
    | undefined;
  if (!validId(ownerId) || row?.owner_id !== ownerId) throw new Error("PHASE07_OWNER_MISMATCH");
}

function assertKnownFile(sqlite: Database.Database, ownerId: string, file: Phase07File): void {
  assertFile(file);
  assertOwner(sqlite, ownerId);
  const row = sqlite
    .prepare("SELECT owner_id,book_id,edition_sha256 FROM phase07_files WHERE book_file_id=?")
    .get(file.bookFileId) as
    | { owner_id: string; book_id: string; edition_sha256: string }
    | undefined;
  if (
    !row ||
    row.owner_id !== ownerId ||
    row.book_id !== file.bookId ||
    row.edition_sha256 !== file.editionSha256
  )
    throw new Error("PHASE07_FILE_EDITION_MISMATCH");
}

function assertReader(
  sqlite: Database.Database,
  ownerId: string,
  deviceId: string,
  token: string,
  nowMs: number,
): void {
  if (!validNumber(nowMs) || !verifyOfflineReader(sqlite, ownerId, deviceId, token, nowMs))
    throw new Error("PHASE07_READER_REVOKED_OR_EXPIRED");
}

function normalizeValue(kind: Phase07Kind, value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("PHASE07_PERSONAL_VALUE_INVALID");
  const p = value as Record<string, unknown>;
  const keys = Object.keys(p).sort().join(",");
  if (
    kind === "RATING" &&
    keys === "kind,score" &&
    p.kind === "RATING" &&
    typeof p.score === "number" &&
    Number.isSafeInteger(p.score) &&
    p.score >= 1 &&
    p.score <= 5
  )
    return JSON.stringify({ kind, score: p.score });
  if (
    kind === "BOOKMARK" &&
    keys === "kind,label,nativePosition" &&
    p.kind === "BOOKMARK" &&
    position(p.nativePosition) &&
    clean(p.label, 160, true)
  )
    return JSON.stringify({ kind, nativePosition: p.nativePosition, label: p.label });
  if (
    kind === "ANNOTATION" &&
    keys === "kind,nativePosition,note,quote" &&
    p.kind === "ANNOTATION" &&
    position(p.nativePosition) &&
    clean(p.quote, 2000) &&
    clean(p.note, 2000, true)
  )
    return JSON.stringify({
      kind,
      nativePosition: p.nativePosition,
      quote: p.quote,
      note: p.note,
    });
  throw new Error("PHASE07_PERSONAL_VALUE_INVALID");
}

/** Register a fixture-bound file; conflicting owner/book/hash cannot be adopted. */
export function registerOfflinePhase07File(
  sqlite: Database.Database,
  actor: OfflineOwner,
  file: Phase07File,
): void {
  if (actor.kind !== "verified-owner-fixture") throw new Error("PHASE07_FIXTURE_OWNER_REQUIRED");
  assertFile(file);
  sqlite
    .transaction(() => {
      assertOwner(sqlite, actor.accountId);
      const phase06 = sqlite
        .prepare(
          "SELECT owner_id,book_id,edition_sha256 FROM phase06_offline_progress WHERE book_file_id=?",
        )
        .get(file.bookFileId) as
        | { owner_id: string; book_id: string; edition_sha256: string }
        | undefined;
      if (
        phase06 &&
        (phase06.owner_id !== actor.accountId ||
          phase06.book_id !== file.bookId ||
          phase06.edition_sha256 !== file.editionSha256)
      )
        throw new Error("PHASE07_FILE_EDITION_MISMATCH");
      sqlite
        .prepare(
          "INSERT OR IGNORE INTO phase07_files(book_file_id,owner_id,book_id,edition_sha256) VALUES (?,?,?,?)",
        )
        .run(file.bookFileId, actor.accountId, file.bookId, file.editionSha256);
      assertKnownFile(sqlite, actor.accountId, file);
    })
    .immediate();
}

/** SQLite CAS and replay receipts. A revoked device cannot replay a prior event. */
export function recordOfflinePhase07Personal(
  sqlite: Database.Database,
  input: Phase07Write,
): Phase07Result {
  if (
    !validId(input.ownerId) ||
    !validId(input.deviceId) ||
    !validId(input.eventId) ||
    !validId(input.recordId) ||
    !validNumber(input.nowMs) ||
    !validNumber(input.expectedRevision) ||
    !["RATING", "BOOKMARK", "ANNOTATION"].includes(input.kind) ||
    !["UPSERT", "DELETE"].includes(input.action) ||
    (input.kind === "RATING" && input.recordId !== "rating") ||
    (input.kind === "RATING" && input.action === "DELETE")
  )
    throw new Error("PHASE07_PERSONAL_EVENT_INVALID");
  assertFile(input.file);
  const value =
    input.action === "UPSERT"
      ? normalizeValue(input.kind, input.value)
      : input.value === null
        ? null
        : (() => {
            throw new Error("PHASE07_DELETE_VALUE_INVALID");
          })();
  const payloadHash = digest([
    input.ownerId,
    input.deviceId,
    input.file,
    input.kind,
    input.recordId,
    input.action,
    value,
    input.expectedRevision,
  ]);
  return sqlite
    .transaction(() => {
      assertReader(sqlite, input.ownerId, input.deviceId, input.token, input.nowMs);
      assertKnownFile(sqlite, input.ownerId, input.file);
      const past = sqlite
        .prepare(
          "SELECT book_file_id,payload_sha256,status,observed_revision FROM phase07_personal_events WHERE event_id=?",
        )
        .get(input.eventId) as
        | {
            book_file_id: string;
            payload_sha256: string;
            status: Phase07Result["status"];
            observed_revision: number;
          }
        | undefined;
      if (past) {
        if (past.book_file_id !== input.file.bookFileId || past.payload_sha256 !== payloadHash)
          throw new Error("PHASE07_PERSONAL_REPLAY_COLLISION");
        return { status: past.status, revision: past.observed_revision };
      }
      const existing = sqlite
        .prepare(
          "SELECT revision FROM phase07_personal_records WHERE book_file_id=? AND kind=? AND record_id=?",
        )
        .get(input.file.bookFileId, input.kind, input.recordId) as { revision: number } | undefined;
      const currentRevision = existing?.revision ?? 0;
      const accepted = currentRevision === input.expectedRevision;
      const revision = accepted ? currentRevision + 1 : currentRevision;
      const status: Phase07Result["status"] = accepted ? "LOCAL_RECORDED" : "CONFLICT";
      if (accepted && existing) {
        const result = sqlite
          .prepare(
            "UPDATE phase07_personal_records SET revision=?,deleted=?,value_json=?,last_event_id=? WHERE book_file_id=? AND kind=? AND record_id=? AND revision=?",
          )
          .run(
            revision,
            input.action === "DELETE" ? 1 : 0,
            value,
            input.eventId,
            input.file.bookFileId,
            input.kind,
            input.recordId,
            currentRevision,
          );
        if (result.changes !== 1) throw new Error("PHASE07_PERSONAL_CAS_LOST");
      } else if (accepted) {
        if (input.action === "DELETE") throw new Error("PHASE07_DELETE_MISSING_RECORD");
        sqlite
          .prepare(
            "INSERT INTO phase07_personal_records(book_file_id,kind,record_id,owner_id,revision,deleted,value_json,last_event_id) VALUES (?,?,?,?,1,0,?,?)",
          )
          .run(
            input.file.bookFileId,
            input.kind,
            input.recordId,
            input.ownerId,
            value,
            input.eventId,
          );
      }
      sqlite
        .prepare(
          "INSERT INTO phase07_personal_events(event_id,book_file_id,payload_sha256,status,observed_revision,created_at) VALUES (?,?,?,?,?,?)",
        )
        .run(input.eventId, input.file.bookFileId, payloadHash, status, revision, input.nowMs);
      return { status, revision };
    })
    .immediate();
}

/** Read a single record with exact immutable file and paired-device checks. */
export function readOfflinePhase07Personal(
  sqlite: Database.Database,
  input: Readonly<{
    ownerId: string;
    deviceId: string;
    token: string;
    file: Phase07File;
    kind: Phase07Kind;
    recordId: string;
    nowMs: number;
  }>,
): Readonly<{ revision: number; deleted: boolean; value: unknown }> | null {
  if (!validId(input.recordId) || !["RATING", "BOOKMARK", "ANNOTATION"].includes(input.kind))
    throw new Error("PHASE07_PERSONAL_READ_INVALID");
  assertReader(sqlite, input.ownerId, input.deviceId, input.token, input.nowMs);
  assertKnownFile(sqlite, input.ownerId, input.file);
  const row = sqlite
    .prepare(
      "SELECT revision,deleted,value_json FROM phase07_personal_records WHERE owner_id=? AND book_file_id=? AND kind=? AND record_id=?",
    )
    .get(input.ownerId, input.file.bookFileId, input.kind, input.recordId) as
    | { revision: number; deleted: number; value_json: string | null }
    | undefined;
  return row
    ? Object.freeze({
        revision: row.revision,
        deleted: row.deleted === 1,
        value: row.deleted === 1 ? null : JSON.parse(row.value_json ?? "null"),
      })
    : null;
}

export type Phase07SessionWrite = Readonly<{
  ownerId: string;
  deviceId: string;
  token: string;
  file: Phase07File;
  sessionId: string;
  eventId: string;
  action: "START" | "STOP";
  expectedRevision: number;
  nowMs: number;
  clientTimestamp?: number;
}>;

/** Uses mock trusted nowMs, never clientTimestamp or client-claimed duration. */
export function recordOfflinePhase07Session(
  sqlite: Database.Database,
  input: Phase07SessionWrite,
): Phase07Result {
  if (
    !validId(input.sessionId) ||
    !validId(input.eventId) ||
    !validNumber(input.expectedRevision) ||
    !validNumber(input.nowMs) ||
    !["START", "STOP"].includes(input.action)
  )
    throw new Error("PHASE07_SESSION_INVALID");
  assertFile(input.file);
  const eventParts = [
    input.ownerId,
    input.deviceId,
    input.file,
    input.sessionId,
    input.eventId,
    input.action,
    input.expectedRevision,
  ];
  // Receipt identity must not depend on the server clock at retry time.
  const hash = digest(eventParts);
  return sqlite
    .transaction(() => {
      assertReader(sqlite, input.ownerId, input.deviceId, input.token, input.nowMs);
      assertKnownFile(sqlite, input.ownerId, input.file);
      const past = sqlite
        .prepare(
          "SELECT session_id,payload_sha256,status,observed_revision,created_at FROM phase07_session_events WHERE event_id=?",
        )
        .get(input.eventId) as
        | {
            session_id: string;
            payload_sha256: string;
            status: Phase07Result["status"];
            observed_revision: number;
            created_at: number;
          }
        | undefined;
      if (past) {
        // Existing fixture receipts used their original server clock in the digest.
        const legacyHash = digest([...eventParts, past.created_at]);
        if (
          past.session_id !== input.sessionId ||
          (past.payload_sha256 !== hash && past.payload_sha256 !== legacyHash)
        )
          throw new Error("PHASE07_SESSION_REPLAY_COLLISION");
        return { status: past.status, revision: past.observed_revision };
      }
      const row = sqlite
        .prepare(
          "SELECT book_file_id,owner_id,device_id,started_at,ended_at,revision FROM phase07_sessions WHERE session_id=?",
        )
        .get(input.sessionId) as
        | {
            book_file_id: string;
            owner_id: string;
            device_id: string;
            started_at: number;
            ended_at: number | null;
            revision: number;
          }
        | undefined;
      if (
        row &&
        (row.book_file_id !== input.file.bookFileId ||
          row.owner_id !== input.ownerId ||
          row.device_id !== input.deviceId)
      )
        throw new Error("PHASE07_SESSION_IDENTITY_MISMATCH");
      const current = row?.revision ?? 0;
      const accepted =
        input.action === "START"
          ? !row && input.expectedRevision === 0
          : !!row && row.ended_at === null && input.expectedRevision === row.revision;
      const revision = accepted ? current + 1 : current;
      const status: Phase07Result["status"] = accepted ? "LOCAL_RECORDED" : "CONFLICT";
      if (accepted && input.action === "START") {
        sqlite
          .prepare(
            "INSERT INTO phase07_sessions(session_id,book_file_id,owner_id,device_id,started_at,revision) VALUES (?,?,?,?,?,1)",
          )
          .run(input.sessionId, input.file.bookFileId, input.ownerId, input.deviceId, input.nowMs);
      } else if (accepted && row) {
        if (input.nowMs < row.started_at || input.nowMs - row.started_at > 24 * 3600 * 1000)
          throw new Error("PHASE07_SESSION_DURATION_INVALID");
        const updated = sqlite
          .prepare(
            "UPDATE phase07_sessions SET ended_at=?,revision=2 WHERE session_id=? AND revision=1 AND ended_at IS NULL",
          )
          .run(input.nowMs, input.sessionId);
        if (updated.changes !== 1) throw new Error("PHASE07_SESSION_CAS_LOST");
      }
      sqlite
        .prepare(
          "INSERT INTO phase07_session_events(event_id,session_id,payload_sha256,status,observed_revision,created_at) VALUES (?,?,?,?,?,?)",
        )
        .run(input.eventId, input.sessionId, hash, status, revision, input.nowMs);
      return { status, revision };
    })
    .immediate();
}

export function readOfflinePhase07Session(
  sqlite: Database.Database,
  input: Readonly<{
    ownerId: string;
    deviceId: string;
    token: string;
    file: Phase07File;
    sessionId: string;
    nowMs: number;
  }>,
) {
  if (!validId(input.sessionId)) throw new Error("PHASE07_SESSION_INVALID");
  assertReader(sqlite, input.ownerId, input.deviceId, input.token, input.nowMs);
  assertKnownFile(sqlite, input.ownerId, input.file);
  const row = sqlite
    .prepare(
      "SELECT device_id,started_at,ended_at,revision FROM phase07_sessions WHERE session_id=? AND book_file_id=? AND owner_id=?",
    )
    .get(input.sessionId, input.file.bookFileId, input.ownerId) as
    | {
        device_id: string;
        started_at: number;
        ended_at: number | null;
        revision: number;
      }
    | undefined;
  return row
    ? Object.freeze({
        deviceId: row.device_id,
        startedAtMs: row.started_at,
        endedAtMs: row.ended_at,
        durationMs: row.ended_at === null ? null : row.ended_at - row.started_at,
        revision: row.revision,
        mode: "LOCAL_PREVIEW_ONLY" as const,
      })
    : null;
}

/** Manual shelf delta only; reject any file not explicitly registered to owner. */
export function previewOfflinePhase07Shelf(
  sqlite: Database.Database,
  input: Readonly<{
    ownerId: string;
    deviceId: string;
    token: string;
    nowMs: number;
    trigger: "MANUAL_OWNER_ACTION";
    known: readonly Phase07File[];
    selected: readonly Phase07File[];
  }>,
) {
  if (
    input.trigger !== "MANUAL_OWNER_ACTION" ||
    !Array.isArray(input.known) ||
    !Array.isArray(input.selected) ||
    input.known.length > 1000 ||
    input.selected.length > 1000
  )
    throw new Error("PHASE07_MANUAL_SHELF_REQUIRED");
  assertReader(sqlite, input.ownerId, input.deviceId, input.token, input.nowMs);
  assertOwner(sqlite, input.ownerId);
  const check = (files: readonly Phase07File[]) => {
    const ids = new Set<string>();
    for (const file of files) {
      assertKnownFile(sqlite, input.ownerId, file);
      if (ids.has(file.bookFileId)) throw new Error("PHASE07_DUPLICATE_SHELF_FILE");
      ids.add(file.bookFileId);
    }
    return ids;
  };
  const before = check(input.known);
  const after = check(input.selected);
  return Object.freeze({
    mode: "MANUAL_PREVIEW_ONLY" as const,
    add: [...after].filter((x) => !before.has(x)).sort(),
    remove: [...before].filter((x) => !after.has(x)).sort(),
    unchanged: [...after].filter((x) => before.has(x)).sort(),
  });
}
