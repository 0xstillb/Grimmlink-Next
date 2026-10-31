import type Database from "better-sqlite3";
import { createHash } from "node:crypto";

export type DurableState = "PENDING" | "LEASED" | "FAILED" | "UNKNOWN" | "DONE" | "CANCELED";
export type DurableJobSummary = Readonly<{
  id: string;
  kind: "METADATA_MOCK" | "COVER_MOCK" | "RESTORE_PREVIEW";
  state: DurableState;
  paused: boolean;
  attempts: number;
  maxAttempts: number;
  dueAt: number;
  lastCode: string | null;
  createdAt: number;
  updatedAt: number;
}>;
type JobRow = {
  id: string;
  kind: string;
  book_id: string;
  plan_hash: string;
  state: DurableState;
  lease_owner: string | null;
  attempts: number;
  max_attempts: number;
  due_at: number;
  paused: number;
};
const validId = (s: string) => /^[a-zA-Z0-9][a-zA-Z0-9:_-]{0,119}$/.test(s);
const validHash = (s: string) => /^[a-f0-9]{64}$/.test(s);
const time = (now: number) => {
  if (!Number.isSafeInteger(now) || now < 0) throw new Error("Invalid monotonic clock input");
};
function event(
  sqlite: Database.Database,
  id: string,
  transition: string,
  code: string,
  now: number,
) {
  sqlite
    .prepare("INSERT INTO job_events(job_id,transition,code,occurred_at) VALUES (?,?,?,?)")
    .run(id, transition, code, now);
}
export function enqueueDurablePlan(
  sqlite: Database.Database,
  item: {
    id: string;
    kind: "METADATA_MOCK" | "COVER_MOCK" | "RESTORE_PREVIEW";
    bookId: string;
    planHash: string;
    idempotencyKey: string;
    now: number;
    maxAttempts?: number;
  },
): string {
  const { id, kind, bookId, planHash, idempotencyKey, now } = item;
  const maxAttempts = item.maxAttempts ?? 3;
  time(now);
  if (
    ![id, bookId, idempotencyKey].every(validId) ||
    !validHash(planHash) ||
    !Number.isInteger(maxAttempts) ||
    maxAttempts < 1 ||
    maxAttempts > 5
  )
    throw new Error("Invalid immutable job plan");
  return sqlite
    .transaction(() => {
      const prior = sqlite
        .prepare("SELECT id,kind,book_id,plan_hash FROM durable_jobs WHERE idempotency_key=?")
        .get(idempotencyKey) as
        | { id: string; kind: string; book_id: string; plan_hash: string }
        | undefined;
      if (prior) {
        if (prior.kind !== kind || prior.book_id !== bookId || prior.plan_hash !== planHash)
          throw new Error("Idempotency key conflicts with immutable plan");
        return prior.id;
      }
      sqlite
        .prepare(
          "INSERT INTO durable_jobs(id,kind,book_id,plan_hash,idempotency_key,state,max_attempts,due_at,created_at,updated_at) VALUES (?,?,?,?,?,'PENDING',?,?,?,?)",
        )
        .run(id, kind, bookId, planHash, idempotencyKey, maxAttempts, now, now, now);
      event(sqlite, id, "ENQUEUED", "LOCAL_PLAN_ONLY", now);
      return id;
    })
    .immediate();
}
/** A stale lease is UNKNOWN (may have been sent). It must never be auto-dispatched again. */
export function recoverExpiredLeases(sqlite: Database.Database, now: number): number {
  time(now);
  return sqlite
    .transaction(() => {
      const rows = sqlite
        .prepare("SELECT id FROM durable_jobs WHERE state='LEASED' AND lease_until<=?")
        .all(now) as { id: string }[];
      for (const row of rows) {
        sqlite
          .prepare(
            "UPDATE durable_jobs SET state='UNKNOWN',lease_owner=NULL,lease_until=NULL,last_code='PROCESS_INTERRUPTED',updated_at=? WHERE id=?",
          )
          .run(now, row.id);
        event(sqlite, row.id, "UNKNOWN", "PROCESS_INTERRUPTED", now);
      }
      return rows.length;
    })
    .immediate();
}
export function claimDuePlan(
  sqlite: Database.Database,
  owner: string,
  now: number,
  ttlMs: number,
): JobRow | null {
  time(now);
  if (
    !validId(owner) ||
    !Number.isSafeInteger(ttlMs) ||
    ttlMs < 1000 ||
    ttlMs > 300000 ||
    !Number.isSafeInteger(now + ttlMs)
  )
    throw new Error("Invalid worker lease");
  return sqlite
    .transaction(() => {
      const row = sqlite
        .prepare(
          "SELECT * FROM durable_jobs WHERE state='PENDING' AND paused=0 AND due_at<=? AND attempts<max_attempts ORDER BY due_at,created_at,id LIMIT 1",
        )
        .get(now) as JobRow | undefined;
      if (!row) return null;
      const changed = sqlite
        .prepare(
          "UPDATE durable_jobs SET state='LEASED',lease_owner=?,lease_until=?,attempts=attempts+1,updated_at=? WHERE id=? AND state='PENDING'",
        )
        .run(owner, now + ttlMs, now, row.id);
      if (changed.changes !== 1) throw new Error("Lease CAS rejected");
      event(sqlite, row.id, "CLAIMED", "LOCAL_LEASE", now);
      return { ...row, state: "LEASED" as const, lease_owner: owner, attempts: row.attempts + 1 };
    })
    .immediate();
}
export function settleClaim(
  sqlite: Database.Database,
  id: string,
  owner: string,
  now: number,
  outcome:
    | { type: "READBACK_MATCH"; observedHash: string }
    | {
        type: "FAILED_BEFORE_DISPATCH";
        code: "NAS_OFFLINE" | "OFFICIAL_OFFLINE" | "STALE_PLAN" | "INVALID_FIXTURE";
      }
    | {
        type: "POST_OUTCOME_UNKNOWN";
        code: "OFFICIAL_OFFLINE" | "TIMEOUT" | "PROCESS_INTERRUPTED";
      },
): DurableState {
  time(now);
  return sqlite
    .transaction(() => {
      const row = sqlite.prepare("SELECT * FROM durable_jobs WHERE id=?").get(id) as
        | JobRow
        | undefined;
      if (!row || row.state !== "LEASED" || row.lease_owner !== owner)
        throw new Error("Lease mismatch or already settled");
      let state: DurableState;
      let code: string;
      if (outcome && typeof outcome === "object" && outcome.type === "READBACK_MATCH") {
        if (outcome.observedHash !== row.plan_hash)
          throw new Error("HTTP success without matching readback");
        state = "DONE";
        code = "FAKE_READBACK_VERIFIED";
      } else if (
        outcome &&
        typeof outcome === "object" &&
        outcome.type === "FAILED_BEFORE_DISPATCH" &&
        ["NAS_OFFLINE", "OFFICIAL_OFFLINE", "STALE_PLAN", "INVALID_FIXTURE"].includes(outcome.code)
      ) {
        state = "FAILED";
        code = outcome.code;
      } else {
        state = "UNKNOWN";
        code =
          outcome &&
          typeof outcome === "object" &&
          outcome.type === "POST_OUTCOME_UNKNOWN" &&
          ["OFFICIAL_OFFLINE", "TIMEOUT", "PROCESS_INTERRUPTED"].includes(outcome.code)
            ? outcome.code
            : "INVALID_OUTCOME";
      }
      sqlite
        .prepare(
          "UPDATE durable_jobs SET state=?,lease_owner=NULL,lease_until=NULL,last_code=?,updated_at=? WHERE id=?",
        )
        .run(state, code, now, id);
      event(sqlite, id, state, code, now);
      return state;
    })
    .immediate();
}
export function retryFailedPlan(sqlite: Database.Database, id: string, now: number): number {
  time(now);
  return sqlite
    .transaction(() => {
      const row = sqlite.prepare("SELECT * FROM durable_jobs WHERE id=?").get(id) as
        | JobRow
        | undefined;
      if (!row || row.state !== "FAILED" || row.attempts >= row.max_attempts)
        throw new Error("Only failed jobs with attempts left can retry");
      const jitter =
        createHash("sha256")
          .update(id + ":" + row.attempts)
          .digest()
          .readUInt16BE(0) % 1000;
      const due = now + Math.min(60000, 1000 * 2 ** row.attempts) + jitter;
      if (!Number.isSafeInteger(due)) throw new Error("Retry clock overflow");
      sqlite
        .prepare(
          "UPDATE durable_jobs SET state='PENDING',due_at=?,updated_at=?,last_code=NULL WHERE id=?",
        )
        .run(due, now, id);
      event(sqlite, id, "RETRY_SCHEDULED", "EXPLICIT_FAILED_RETRY", now);
      return due;
    })
    .immediate();
}
export function reconcileUnknownPlan(
  sqlite: Database.Database,
  id: string,
  now: number,
  observation:
    | { type: "MATCHING_READBACK"; observedHash: string }
    | { type: "CONFIRMED_NOT_APPLIED" },
): DurableState {
  time(now);
  if (
    !observation ||
    (observation.type !== "MATCHING_READBACK" && observation.type !== "CONFIRMED_NOT_APPLIED")
  )
    throw new Error("Invalid reconciliation evidence");
  return sqlite
    .transaction(() => {
      const row = sqlite.prepare("SELECT * FROM durable_jobs WHERE id=?").get(id) as
        | JobRow
        | undefined;
      if (!row || row.state !== "UNKNOWN")
        throw new Error("Only UNKNOWN outcomes can be reconciled");
      if (observation.type === "MATCHING_READBACK" && observation.observedHash !== row.plan_hash)
        throw new Error("Readback does not prove applied plan");
      const state = observation.type === "MATCHING_READBACK" ? "DONE" : "FAILED";
      sqlite
        .prepare("UPDATE durable_jobs SET state=?,updated_at=?,last_code=? WHERE id=?")
        .run(state, now, observation.type, id);
      event(sqlite, id, "RECONCILED", observation.type, now);
      return state;
    })
    .immediate();
}
export function controlPendingPlan(
  sqlite: Database.Database,
  id: string,
  now: number,
  action: "PAUSE" | "RESUME" | "CANCEL",
): void {
  time(now);
  if (action !== "PAUSE" && action !== "RESUME" && action !== "CANCEL")
    throw new Error("Invalid plan action");
  sqlite
    .transaction(() => {
      const row = sqlite.prepare("SELECT * FROM durable_jobs WHERE id=?").get(id) as
        | JobRow
        | undefined;
      if (!row || !["PENDING", "FAILED"].includes(row.state))
        throw new Error("Cannot control leased, unknown or terminal plan");
      if (action === "CANCEL")
        sqlite
          .prepare("UPDATE durable_jobs SET state='CANCELED',updated_at=? WHERE id=?")
          .run(now, id);
      else
        sqlite
          .prepare("UPDATE durable_jobs SET paused=?,updated_at=? WHERE id=?")
          .run(action === "PAUSE" ? 1 : 0, now, id);
      event(sqlite, id, action, "OWNER_LOCAL_ONLY", now);
    })
    .immediate();
}
export function getJobSnapshot(sqlite: Database.Database, id: string) {
  if (!validId(id)) throw new Error("Invalid job id");
  const row = sqlite
    .prepare(
      "SELECT id,kind,book_id,plan_hash,state,paused,attempts,max_attempts,due_at,last_code,created_at,updated_at FROM durable_jobs WHERE id=?",
    )
    .get(id);
  return row ?? null;
}
/** Owner dashboard projection. File identity and plan hashes are deliberately excluded. */
export function listDurableJobs(
  sqlite: Database.Database,
  limit = 100,
): readonly DurableJobSummary[] {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100)
    throw new Error("Invalid local job list limit");
  const rows = sqlite
    .prepare(
      "SELECT id,kind,state,paused,attempts,max_attempts AS maxAttempts,due_at AS dueAt,last_code AS lastCode,created_at AS createdAt,updated_at AS updatedAt FROM durable_jobs ORDER BY updated_at DESC,id DESC LIMIT ?",
    )
    .all(limit) as Array<{
    id: string;
    kind: string;
    state: string;
    paused: number;
    attempts: number;
    maxAttempts: number;
    dueAt: number;
    lastCode: string | null;
    createdAt: number;
    updatedAt: number;
  }>;
  return rows.map((row) => {
    if (
      !validId(row.id) ||
      !["METADATA_MOCK", "COVER_MOCK", "RESTORE_PREVIEW"].includes(row.kind) ||
      !["PENDING", "LEASED", "FAILED", "UNKNOWN", "DONE", "CANCELED"].includes(row.state) ||
      (row.paused !== 0 && row.paused !== 1) ||
      !Number.isSafeInteger(row.attempts) ||
      row.attempts < 0 ||
      !Number.isSafeInteger(row.maxAttempts) ||
      row.maxAttempts < 1 ||
      row.maxAttempts > 5 ||
      row.attempts > row.maxAttempts ||
      !Number.isSafeInteger(row.dueAt) ||
      !Number.isSafeInteger(row.createdAt) ||
      !Number.isSafeInteger(row.updatedAt) ||
      (row.lastCode !== null && !/^[A-Z_]{1,64}$/.test(row.lastCode))
    ) {
      throw new Error("Invalid local job row");
    }
    return Object.freeze({
      id: row.id,
      kind: row.kind as DurableJobSummary["kind"],
      state: row.state as DurableState,
      paused: row.paused === 1,
      attempts: row.attempts,
      maxAttempts: row.maxAttempts,
      dueAt: row.dueAt,
      lastCode: row.lastCode,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  });
}
export function replayJobEvents(sqlite: Database.Database, afterSeq: number, limit = 100) {
  if (
    !Number.isSafeInteger(afterSeq) ||
    afterSeq < 0 ||
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 100
  )
    throw new Error("Invalid replay cursor");
  return sqlite
    .prepare(
      "SELECT seq,job_id AS jobId,transition,code,occurred_at AS occurredAt FROM job_events WHERE seq>? ORDER BY seq LIMIT ?",
    )
    .all(afterSeq, limit) as Array<{
    seq: number;
    jobId: string;
    transition: string;
    code: string;
    occurredAt: number;
  }>;
}
