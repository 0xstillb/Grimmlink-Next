import { createHash } from "node:crypto";
import type Database from "better-sqlite3";
import { type OfflineOwner, verifyOfflineReader } from "./phase05-devices.js";

/**
 * OFFLINE MOCK ONLY. Never mounted over HTTP, never writes Official, and cannot
 * assert that an EPUB anchor came from a real reader or an actual EPUB parser.
 */
const id = (v: unknown): v is string =>
  typeof v === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(v);
const sha = (v: unknown): v is string =>
  typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
const validInt = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
const opaque = (v: unknown): v is string =>
  typeof v === "string" && v.length > 3 && v.length <= 2048 &&
  (v.startsWith("epubcfi(/") || v.startsWith("xpointer(/")) &&
  v.endsWith(")") && !/[\x00-\x20\x7f<>%\\]/.test(v) &&
  v.indexOf(")") === v.length - 1;

export type OfflineProgressIdentity = Readonly<{
  bookId: string;
  bookFileId: string;
  editionSha256: string;
  format: "EPUB" | "PDF";
  verifiedFixturePageCount?: number;
}>;

function assertIdentity(input: OfflineProgressIdentity): void {
  if (
    !input || !id(input.bookId) || !id(input.bookFileId) || !sha(input.editionSha256) ||
    (input.format !== "EPUB" && input.format !== "PDF") ||
    (input.format === "PDF" &&
      (!validInt(input.verifiedFixturePageCount) ||
        input.verifiedFixturePageCount! < 1 || input.verifiedFixturePageCount! > 100000)) ||
    (input.format === "EPUB" && input.verifiedFixturePageCount !== undefined)
  ) throw new Error("PHASE06_OFFLINE_IDENTITY_INVALID");
}

function assertOwner(sqlite: Database.Database, ownerId: string): void {
  const row = sqlite.prepare("SELECT owner_id FROM single_owner WHERE slot=1").get() as
    | { owner_id: string } | undefined;
  if (!row || row.owner_id !== ownerId) throw new Error("PHASE06_OWNER_MISMATCH");
}

/** Once registered, each BookFileId stays attached to exactly one edition and format. */
export function registerOfflineProgressFile(
  sqlite: Database.Database,
  actor: OfflineOwner,
  identity: OfflineProgressIdentity,
): void {
  assertIdentity(identity);
  if (actor?.kind !== "verified-owner-fixture" || !id(actor.accountId))
    throw new Error("PHASE06_OWNER_FIXTURE_REQUIRED");
  sqlite.transaction(() => {
    assertOwner(sqlite, actor.accountId);
    const prior = sqlite.prepare(
      "SELECT owner_id,book_id,edition_sha256,format,verified_fixture_page_count FROM phase06_offline_progress WHERE book_file_id=?",
    ).get(identity.bookFileId) as
      | { owner_id: string; book_id: string; edition_sha256: string; format: string;
          verified_fixture_page_count: number | null } | undefined;
    const pages = identity.verifiedFixturePageCount ?? null;
    if (prior) {
      if (prior.owner_id !== actor.accountId || prior.book_id !== identity.bookId ||
        prior.edition_sha256 !== identity.editionSha256 || prior.format !== identity.format ||
        prior.verified_fixture_page_count !== pages)
        throw new Error("PHASE06_EDITION_DRIFT");
      return;
    }
    sqlite.prepare(
      "INSERT INTO phase06_offline_progress(book_file_id,owner_id,book_id,edition_sha256,format,verified_fixture_page_count) VALUES (?,?,?,?,?,?)",
    ).run(identity.bookFileId, actor.accountId, identity.bookId, identity.editionSha256, identity.format, pages);
  }).immediate();
}

export type OfflineProgressPosition =
  | Readonly<{ kind: "EPUB_EXACT"; anchorId: string; nativePosition: string;
      evidence: "OFFLINE_SYNTHETIC_FIXTURE_ONLY" }>
  | Readonly<{ kind: "PDF_PAGE"; pageNumber: number }>;

function validatePosition(position: OfflineProgressPosition, identity: OfflineProgressIdentity): void {
  if (!position || (
    position.kind === "EPUB_EXACT"
      ? (identity.format !== "EPUB" || !id(position.anchorId) || !opaque(position.nativePosition) ||
          position.evidence !== "OFFLINE_SYNTHETIC_FIXTURE_ONLY")
      : position.kind === "PDF_PAGE"
        ? (identity.format !== "PDF" || !validInt(position.pageNumber) || position.pageNumber < 1 ||
            position.pageNumber > identity.verifiedFixturePageCount!)
        : true
  )) throw new Error("PHASE06_OFFLINE_POSITION_INVALID");
}

/**
 * Transactional local CAS; old revision conflicts, exact retry idempotent.
 * Device timestamps are deliberately not accepted. Revocation checked within
 * the same SQLite transaction. No Native KOSync or Official writer is wired.
 */
export function recordOfflinePhase06Progress(
  sqlite: Database.Database,
  input: Readonly<{
    ownerId: string;
    deviceId: string;
    token: string;
    identity: OfflineProgressIdentity;
    eventId: string;
    expectedRevision: number;
    position: OfflineProgressPosition;
    nowMs: number;
  }>,
): Readonly<{ status: "LOCAL_RECORDED" | "CONFLICT"; revision: number }> {
  assertIdentity(input.identity);
  validatePosition(input.position, input.identity);
  if (!id(input.ownerId) || !id(input.deviceId) || !id(input.eventId) ||
      !validInt(input.expectedRevision) || !validInt(input.nowMs))
    throw new Error("PHASE06_EVENT_INVALID");
  const payloadSha = createHash("sha256").update(JSON.stringify([
    input.ownerId, input.deviceId, input.identity, input.expectedRevision, input.position,
  ])).digest("hex");
  return sqlite.transaction(() => {
    if (!verifyOfflineReader(sqlite, input.ownerId, input.deviceId, input.token, input.nowMs))
      throw new Error("PHASE06_READER_REVOKED_OR_EXPIRED");
    assertOwner(sqlite, input.ownerId);
    const prior = sqlite.prepare(
      "SELECT book_file_id,payload_sha256,result,observed_revision FROM phase06_offline_events WHERE event_id=?",
    ).get(input.eventId) as
      | { book_file_id: string; payload_sha256: string; result: "LOCAL_RECORDED" | "CONFLICT";
          observed_revision: number } | undefined;
    if (prior) {
      if (prior.book_file_id !== input.identity.bookFileId || prior.payload_sha256 !== payloadSha)
        throw new Error("PHASE06_EVENT_REPLAY_MISMATCH");
      return { status: prior.result, revision: prior.observed_revision };
    }
    const row = sqlite.prepare(
      "SELECT owner_id,book_id,edition_sha256,format,verified_fixture_page_count,revision FROM phase06_offline_progress WHERE book_file_id=?",
    ).get(input.identity.bookFileId) as
      | { owner_id: string; book_id: string; edition_sha256: string; format: string;
          verified_fixture_page_count: number | null; revision: number } | undefined;
    if (!row || row.owner_id !== input.ownerId || row.book_id !== input.identity.bookId ||
        row.edition_sha256 !== input.identity.editionSha256 || row.format !== input.identity.format ||
        row.verified_fixture_page_count !== (input.identity.verifiedFixturePageCount ?? null))
      throw new Error("PHASE06_EVENT_EDITION_MISMATCH");
    const accepted = row.revision === input.expectedRevision;
    if (accepted) {
      const result = sqlite.prepare(
        "UPDATE phase06_offline_progress SET revision=revision+1,position_kind=?,native_position=?,page_number=?,last_event_id=? WHERE book_file_id=? AND revision=?",
      ).run(
        input.position.kind, input.position.kind === "EPUB_EXACT" ? input.position.nativePosition : null,
        input.position.kind === "PDF_PAGE" ? input.position.pageNumber : null,
        input.eventId, input.identity.bookFileId, input.expectedRevision,
      );
      if (result.changes !== 1) throw new Error("PHASE06_CAS_LOST");
    }
    const revision = accepted ? row.revision + 1 : row.revision;
    const status = accepted ? ("LOCAL_RECORDED" as const) : ("CONFLICT" as const);
    sqlite.prepare(
      "INSERT INTO phase06_offline_events(event_id,book_file_id,payload_sha256,result,observed_revision,created_at) VALUES (?,?,?,?,?,?)",
    ).run(input.eventId, input.identity.bookFileId, payloadSha, status, revision, input.nowMs);
    return { status, revision };
  }).immediate();
}

/** Token-bound local Continue Reading read; NULL percent is an intentional truth constraint. */
export function readOfflinePhase06Resume(
  sqlite: Database.Database,
  input: Readonly<{ ownerId: string; deviceId: string; token: string; identity: OfflineProgressIdentity; nowMs: number }>,
) {
  assertIdentity(input.identity);
  if (!validInt(input.nowMs) || !verifyOfflineReader(sqlite, input.ownerId, input.deviceId, input.token, input.nowMs))
    throw new Error("PHASE06_READER_REVOKED_OR_EXPIRED");
  assertOwner(sqlite, input.ownerId);
  const row = sqlite.prepare(
    "SELECT owner_id,book_id,format,edition_sha256,verified_fixture_page_count,revision,position_kind,native_position,page_number FROM phase06_offline_progress WHERE book_file_id=?",
  ).get(input.identity.bookFileId) as
    | { owner_id: string; book_id: string; format: string; edition_sha256: string;
        verified_fixture_page_count: number | null; revision: number;
        position_kind: string | null; native_position: string | null; page_number: number | null } | undefined;
  if (!row || row.owner_id !== input.ownerId || row.book_id !== input.identity.bookId ||
      row.format !== input.identity.format || row.edition_sha256 !== input.identity.editionSha256 ||
      row.verified_fixture_page_count !== (input.identity.verifiedFixturePageCount ?? null))
    throw new Error("PHASE06_EVENT_EDITION_MISMATCH");
  if (row.revision === 0) return Object.freeze({ status: "NO_POSITION" as const, percentage: null });
  if (row.position_kind === "PDF_PAGE" && row.page_number !== null &&
      row.verified_fixture_page_count !== null) {
    return Object.freeze({ status: "LOCAL_PREVIEW_ONLY" as const, revision: row.revision,
      kind: "PDF_PAGE" as const, pageNumber: row.page_number,
      pageCount: row.verified_fixture_page_count, label: "Page " + row.page_number +
        " of " + row.verified_fixture_page_count, percentage: null });
  }
  if (row.position_kind === "EPUB_EXACT" && row.native_position !== null) {
    return Object.freeze({ status: "LOCAL_PREVIEW_ONLY" as const, revision: row.revision,
      kind: "EPUB_EXACT" as const, nativePosition: row.native_position,
      label: "Resume at exact EPUB anchor", percentage: null });
  }
  throw new Error("PHASE06_CORRUPT_POSITION");
}
