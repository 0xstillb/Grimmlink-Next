import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type Database from "better-sqlite3";

/**
 * Phase05 OFFLINE contract only. No production route mounts or Official
 * impersonation: trusted owner principal must come from future live login.
 * SQLite is local, private (0600) and carries only token hashes.
 */
const validId = (id: string): boolean => /^[A-Za-z0-9_-]{1,128}$/.test(id);
const validHash = (value: string): boolean => /^[0-9a-f]{64}$/.test(value);
const validKoHash = (value: string): boolean => /^[0-9a-f]{32}$/.test(value);
const validTime = (value: number): boolean => Number.isSafeInteger(value) && value >= 0;
const tokenHash = (token: string): string =>
  createHash("sha256").update(token, "utf8").digest("hex");

export type OfflineOwner = Readonly<{ kind: "verified-owner-fixture"; accountId: string }>;

function requireOwner(actor: OfflineOwner, now: number): void {
  if (actor.kind !== "verified-owner-fixture" || !validId(actor.accountId) || !validTime(now)) {
    throw new Error("OWNER_FIXTURE_REQUIRED");
  }
}

function assertCanonicalOwner(sqlite: Database.Database, ownerId: string): void {
  const owner = sqlite.prepare("SELECT owner_id FROM single_owner WHERE slot=1").get() as
    | { owner_id: string }
    | undefined;
  if (!owner || owner.owner_id !== ownerId) throw new Error("OWNER_MISMATCH");
}

export function pairOfflineReader(
  sqlite: Database.Database,
  actor: OfflineOwner,
  deviceId: string,
  nowMs: number,
  expiresAtMs: number,
): Readonly<{ deviceId: string; token: string }> {
  requireOwner(actor, nowMs);
  if (!validId(deviceId) || !validTime(expiresAtMs) || expiresAtMs <= nowMs) {
    throw new Error("PAIRING_INVALID");
  }
  if (expiresAtMs - nowMs > 90 * 24 * 3600 * 1000) throw new Error("PAIRING_TTL_TOO_LONG");
  const token = randomBytes(32).toString("base64url");
  sqlite
    .transaction(() => {
      sqlite
        .prepare("INSERT OR IGNORE INTO single_owner(slot,owner_id) VALUES (1,?)")
        .run(actor.accountId);
      assertCanonicalOwner(sqlite, actor.accountId);
      sqlite
        .prepare(
          "INSERT INTO paired_reader_devices(device_id,owner_id,token_sha256,expires_at,created_at) VALUES (?,?,?,?,?)",
        )
        .run(deviceId, actor.accountId, tokenHash(token), expiresAtMs, nowMs);
    })
    .immediate();
  return { deviceId, token };
}

export function verifyOfflineReader(
  sqlite: Database.Database,
  ownerId: string,
  deviceId: string,
  token: string,
  nowMs: number,
): boolean {
  if (
    !validId(ownerId) ||
    !validId(deviceId) ||
    !validTime(nowMs) ||
    !/^[A-Za-z0-9_-]{43}$/.test(token)
  )
    return false;
  const row = sqlite
    .prepare(
      "SELECT token_sha256,expires_at,revoked_at FROM paired_reader_devices WHERE device_id=? AND owner_id=?",
    )
    .get(deviceId, ownerId) as
    | { token_sha256: string; expires_at: number; revoked_at: number | null }
    | undefined;
  if (!row || row.revoked_at !== null || row.expires_at <= nowMs || !validHash(row.token_sha256))
    return false;
  return timingSafeEqual(
    Buffer.from(row.token_sha256, "hex"),
    Buffer.from(tokenHash(token), "hex"),
  );
}

export function revokeOfflineReader(
  sqlite: Database.Database,
  actor: OfflineOwner,
  deviceId: string,
  nowMs: number,
): void {
  requireOwner(actor, nowMs);
  if (!validId(deviceId)) throw new Error("PAIRING_INVALID");
  sqlite
    .transaction(() => {
      assertCanonicalOwner(sqlite, actor.accountId);
      const result = sqlite
        .prepare(
          "UPDATE paired_reader_devices SET revoked_at=?,generation=generation+1 WHERE device_id=? AND owner_id=? AND revoked_at IS NULL",
        )
        .run(nowMs, deviceId, actor.accountId);
      if (result.changes !== 1) throw new Error("PAIRING_NOT_ACTIVE");
    })
    .immediate();
}

/**
 * Rotate a single still-active reader token in one local SQLite transaction.
 * Never returns stored hashes, and the previous token immediately stops working.
 * Owner fixture is NOT a production login and this is not mounted over HTTP.
 */
export function rotateOfflineReader(
  sqlite: Database.Database,
  actor: OfflineOwner,
  deviceId: string,
  nowMs: number,
  expiresAtMs: number,
): Readonly<{ deviceId: string; token: string; generation: number }> {
  requireOwner(actor, nowMs);
  if (
    !validId(deviceId) ||
    !validTime(expiresAtMs) ||
    expiresAtMs <= nowMs ||
    expiresAtMs - nowMs > 90 * 24 * 3600 * 1000
  )
    throw new Error("ROTATION_INVALID");
  const token = randomBytes(32).toString("base64url");
  const generation = sqlite.transaction(() => {
    assertCanonicalOwner(sqlite, actor.accountId);
    const result = sqlite
      .prepare(
        "UPDATE paired_reader_devices SET token_sha256=?,expires_at=?,generation=generation+1 WHERE device_id=? AND owner_id=? AND revoked_at IS NULL AND expires_at>?",
      )
      .run(tokenHash(token), expiresAtMs, deviceId, actor.accountId, nowMs);
    if (result.changes !== 1) throw new Error("ROTATION_NOT_ACTIVE");
    const row = sqlite.prepare("SELECT generation FROM paired_reader_devices WHERE device_id=?")
      .get(deviceId) as { generation: number };
    return row.generation;
  }).immediate();
  return { deviceId, token, generation };
}

/** Redacted owner-side listing for the future Control Center; no credential bytes. */
export function listOfflineReaders(
  sqlite: Database.Database,
  actor: OfflineOwner,
): readonly Readonly<{
  deviceId: string;
  generation: number;
  expiresAtMs: number;
  revokedAtMs: number | null;
}>[] {
  requireOwner(actor, 0);
  assertCanonicalOwner(sqlite, actor.accountId);
  return sqlite
    .prepare(
      "SELECT device_id AS deviceId,generation,expires_at AS expiresAtMs,revoked_at AS revokedAtMs FROM paired_reader_devices WHERE owner_id=? ORDER BY created_at,device_id",
    )
    .all(actor.accountId) as {
      deviceId: string;
      generation: number;
      expiresAtMs: number;
      revokedAtMs: number | null;
    }[];
}

export type MockWriterMode = "DISABLED" | "MOCK_MANAGED";

/** State is bound to KO document, Official file identity and exact byte SHA. */
export function registerOfflineSyncDocument(
  sqlite: Database.Database,
  actor: OfflineOwner,
  identity: {
    koPartialMd5: string;
    bookFileId: string;
    editionSha256: string;
  },
): void {
  requireOwner(actor, 0);
  if (
    !validKoHash(identity.koPartialMd5) ||
    !validId(identity.bookFileId) ||
    !validHash(identity.editionSha256)
  )
    throw new Error("SYNC_IDENTITY_INVALID");
  sqlite
    .transaction(() => {
      assertCanonicalOwner(sqlite, actor.accountId);
      const existing = sqlite
        .prepare(
          "SELECT owner_id,book_file_id,edition_sha256 FROM phase05_writer_state WHERE document_id=?",
        )
        .get(identity.koPartialMd5) as
        | { owner_id: string; book_file_id: string; edition_sha256: string }
        | undefined;
      if (existing) {
        if (
          existing.owner_id !== actor.accountId ||
          existing.book_file_id !== identity.bookFileId ||
          existing.edition_sha256 !== identity.editionSha256
        )
          throw new Error("SYNC_HASH_COLLISION_OR_EDITION_DRIFT");
        return;
      }
      sqlite
        .prepare(
          "INSERT INTO phase05_writer_state(document_id,owner_id,book_file_id,edition_sha256,mode,revision) VALUES (?,?,?,?,'DISABLED',0)",
        )
        .run(identity.koPartialMd5, actor.accountId, identity.bookFileId, identity.editionSha256);
    })
    .immediate();
}

/**
 * Explicit, locally reconciled mock switch only. No Native mode is representable
 * here: atomic Official ACL is unresolved and Native KOSync remains BLOCKED/OFF.
 */
export function switchOfflineWriter(
  sqlite: Database.Database,
  actor: OfflineOwner,
  documentHash: string,
  expectedRevision: number,
  targetMode: MockWriterMode,
  proof: Readonly<{ noInflightWrites: true; observedRevision: number }>,
): number {
  requireOwner(actor, 0);
  if (
    !validKoHash(documentHash) ||
    !validTime(expectedRevision) ||
    (targetMode !== "DISABLED" && targetMode !== "MOCK_MANAGED") ||
    proof.noInflightWrites !== true ||
    proof.observedRevision !== expectedRevision
  )
    throw new Error("SYNC_SWITCH_RECONCILIATION_REQUIRED");
  return sqlite
    .transaction(() => {
      assertCanonicalOwner(sqlite, actor.accountId);
      const result = sqlite
        .prepare(
          "UPDATE phase05_writer_state SET mode=?,revision=revision+1 WHERE document_id=? AND owner_id=? AND revision=?",
        )
        .run(targetMode, documentHash, actor.accountId, expectedRevision);
      if (result.changes !== 1) throw new Error("SYNC_SWITCH_STALE");
      return expectedRevision + 1;
    })
    .immediate();
}

/** Durable mock-only event. Device timestamps are ignored; revision is authoritative. */
export function recordOfflinePosition(
  sqlite: Database.Database,
  input: {
    ownerId: string;
    deviceId: string;
    token: string;
    documentHash: string;
    bookFileId: string;
    editionSha256: string;
    eventId: string;
    position: string;
    expectedRevision: number;
    nowMs: number;
    clientTimestamp?: number;
  },
): Readonly<{ state: "LOCAL_RECORDED" | "CONFLICT"; revision: number }> {
  const {
    ownerId,
    deviceId,
    token,
    documentHash,
    bookFileId,
    editionSha256,
    eventId,
    position,
    expectedRevision,
    nowMs,
  } = input;
  if (
    !validId(ownerId) ||
    !validId(deviceId) ||
    !validId(bookFileId) ||
    !validId(eventId) ||
    !validKoHash(documentHash) ||
    !validHash(editionSha256) ||
    !validTime(nowMs) ||
    !validTime(expectedRevision) ||
    typeof position !== "string" ||
    position.length < 1 ||
    position.length > 4096 ||
    position.includes("\0")
  )
    throw new Error("SYNC_EVENT_INVALID");
  const payloadHash = createHash("sha256")
    .update(JSON.stringify([documentHash, bookFileId, editionSha256, position, expectedRevision]))
    .digest("hex");
  return sqlite
    .transaction(() => {
      if (!verifyOfflineReader(sqlite, ownerId, deviceId, token, nowMs)) {
        throw new Error("SYNC_READER_REVOKED_OR_EXPIRED");
      }
      assertCanonicalOwner(sqlite, ownerId);
      const past = sqlite
        .prepare(
          "SELECT document_id,payload_sha256,status,observed_revision FROM phase05_mock_sync_events WHERE event_id=?",
        )
        .get(eventId) as
        | {
            document_id: string;
            payload_sha256: string;
            status: "LOCAL_RECORDED" | "CONFLICT";
            observed_revision: number;
          }
        | undefined;
      if (past) {
        if (past.document_id !== documentHash || past.payload_sha256 !== payloadHash)
          throw new Error("SYNC_EVENT_IDEMPOTENCY_CONFLICT");
        return { state: past.status, revision: past.observed_revision };
      }
      const row = sqlite
        .prepare(
          "SELECT owner_id,book_file_id,edition_sha256,mode,revision FROM phase05_writer_state WHERE document_id=?",
        )
        .get(documentHash) as
        | {
            owner_id: string;
            book_file_id: string;
            edition_sha256: string;
            mode: MockWriterMode;
            revision: number;
          }
        | undefined;
      if (
        !row ||
        row.owner_id !== ownerId ||
        row.book_file_id !== bookFileId ||
        row.edition_sha256 !== editionSha256
      )
        throw new Error("SYNC_IDENTITY_MISMATCH");
      if (row.mode !== "MOCK_MANAGED") throw new Error("SYNC_WRITER_DISABLED");
      const accepted = row.revision === expectedRevision;
      if (accepted) {
        const result = sqlite
          .prepare(
            "UPDATE phase05_writer_state SET revision=revision+1,native_position=?,last_event_id=? WHERE document_id=? AND revision=?",
          )
          .run(position, eventId, documentHash, expectedRevision);
        if (result.changes !== 1) throw new Error("SYNC_CAS_LOST");
      }
      const revision = accepted ? expectedRevision + 1 : row.revision;
      const state: "LOCAL_RECORDED" | "CONFLICT" = accepted ? "LOCAL_RECORDED" : "CONFLICT";
      sqlite
        .prepare(
          "INSERT INTO phase05_mock_sync_events(event_id,document_id,payload_sha256,status,observed_revision,created_at) VALUES (?,?,?,?,?,?)",
        )
        .run(eventId, documentHash, payloadHash, state, revision, nowMs);
      return { state, revision };
    })
    .immediate();
}

/** Preview is local and restricted by verified token; never expose via live routes. */
export function readOfflinePosition(
  sqlite: Database.Database,
  ownerId: string,
  deviceId: string,
  token: string,
  documentHash: string,
  nowMs: number,
): Readonly<{ position: string | null; revision: number }> {
  if (!validKoHash(documentHash) || !verifyOfflineReader(sqlite, ownerId, deviceId, token, nowMs))
    throw new Error("SYNC_READER_REVOKED_OR_EXPIRED");
  const row = sqlite
    .prepare(
      "SELECT native_position,revision,mode FROM phase05_writer_state WHERE owner_id=? AND document_id=?",
    )
    .get(ownerId, documentHash) as
    | { native_position: string | null; revision: number; mode: MockWriterMode }
    | undefined;
  if (!row || row.mode !== "MOCK_MANAGED") throw new Error("SYNC_WRITER_DISABLED");
  return { position: row.native_position, revision: row.revision };
}
