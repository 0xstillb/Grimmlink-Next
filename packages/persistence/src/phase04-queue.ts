import type Database from "better-sqlite3";
import { claimDuePlan, controlPendingPlan, enqueueDurablePlan, reconcileUnknownPlan, recoverExpiredLeases, settleClaim } from "./recovery-jobs.js";

type Plan = Parameters<typeof enqueueDurablePlan>[1];
type Completion = Parameters<typeof settleClaim>[4];
const validId = (id: string): boolean => /^[A-Za-z0-9][A-Za-z0-9:_-]{0,119}$/.test(id);
const validHash = (hash: string): boolean => /^[a-f0-9]{64}$/.test(hash);
function time(now: number): void {
  if (!Number.isSafeInteger(now) || now < 0) throw new Error("Invalid clock");
}
function record(sqlite: Database.Database, jobId: string, step: "METADATA" | "COVER", status: "VERIFIED" | "UNKNOWN", fingerprint: string, now: number): void {
  time(now);
  if (!validId(jobId) || !validHash(fingerprint)) throw new Error("Invalid job receipt");
  const prior = sqlite.prepare("SELECT status,fingerprint FROM job_step_receipts WHERE job_id=? AND step=?")
    .get(jobId, step) as {status: string; fingerprint: string} | undefined;
  if (prior) {
    if (prior.status !== status || prior.fingerprint !== fingerprint) throw new Error("Receipt idempotency conflict");
    return;
  }
  sqlite.prepare("INSERT INTO job_step_receipts(job_id,step,status,fingerprint,occurred_at) VALUES (?,?,?,?,?)")
    .run(jobId,step,status,fingerprint,now);
}
export function enqueueExclusivePlan(sqlite: Database.Database, plan: Plan): string {
  return sqlite.transaction(() => {
    const prior = sqlite.prepare("SELECT id,book_id,plan_hash,kind FROM durable_jobs WHERE idempotency_key=?")
      .get(plan.idempotencyKey) as {id:string; book_id:string; plan_hash:string; kind:string} | undefined;
    if (prior) {
      if (prior.book_id !== plan.bookId || prior.plan_hash !== plan.planHash || prior.kind !== plan.kind)
        throw new Error("Immutable plan idempotency mismatch");
      return prior.id;
    }
    const held = sqlite.prepare("SELECT job_id FROM active_plan_locks WHERE book_id=?").get(plan.bookId);
    if (held) throw new Error("Exclusive book plan lock held");
    const id = enqueueDurablePlan(sqlite, plan);
    sqlite.prepare("INSERT INTO active_plan_locks(book_id,job_id) VALUES (?,?)").run(plan.bookId,id);
    return id;
  }).immediate();
}
function releaseLock(sqlite: Database.Database, jobId: string): void {
  sqlite.prepare("DELETE FROM active_plan_locks WHERE job_id=?").run(jobId);
}
export function completeExclusiveClaim(sqlite: Database.Database, jobId: string, owner: string, now: number, completion: Completion, receiptStep?: "METADATA" | "COVER"): string {
  return sqlite.transaction(() => {
    const state = settleClaim(sqlite,jobId,owner,now,completion);
    if (state === "DONE") {
      if (receiptStep === undefined || completion.type !== "READBACK_MATCH") throw new Error("Verified step receipt required");
      record(sqlite,jobId,receiptStep,"VERIFIED",completion.observedHash,now);
      releaseLock(sqlite,jobId);
    }
    return state;
  }).immediate();
}
export function reconcileExclusiveUnknown(sqlite: Database.Database, jobId: string, now: number,
  observation: Parameters<typeof reconcileUnknownPlan>[3], receiptStep?: "METADATA" | "COVER"): string {
  return sqlite.transaction(() => {
    const state = reconcileUnknownPlan(sqlite,jobId,now,observation);
    if (state === "DONE") {
      if (observation.type !== "MATCHING_READBACK" || receiptStep === undefined) throw new Error("Missing readback receipt");
      record(sqlite,jobId,receiptStep,"VERIFIED",observation.observedHash,now);
      releaseLock(sqlite,jobId);
    }
    return state;
  }).immediate();
}
export function cancelExclusivePlan(sqlite: Database.Database, jobId: string, now: number): void {
  sqlite.transaction(() => {
    controlPendingPlan(sqlite,jobId,now,"CANCEL");
    releaseLock(sqlite,jobId);
  }).immediate();
}
export function getJobStepReceipts(sqlite: Database.Database, jobId: string) {
  if (!validId(jobId)) throw new Error("Invalid job id");
  return sqlite.prepare("SELECT step,status,fingerprint,occurred_at AS occurredAt FROM job_step_receipts WHERE job_id=? ORDER BY step")
    .all(jobId) as Array<{step:string;status:string;fingerprint:string;occurredAt:number}>;
}
export function enqueueLocalOutbox(sqlite: Database.Database, id: string, jobId: string, now: number): string {
  time(now);
  if (!validId(id) || !validId(jobId)) throw new Error("Invalid outbox identifiers");
  return sqlite.transaction(() => {
    const existing = sqlite.prepare("SELECT id FROM outbox WHERE idempotency_key=?").get("job:"+jobId) as {id:string}|undefined;
    if (existing) return existing.id;
    const job = sqlite.prepare("SELECT id FROM durable_jobs WHERE id=?").get(jobId);
    if (!job) throw new Error("Outbox references unknown job");
    sqlite.prepare("INSERT INTO outbox(id,event_type,state,idempotency_key,created_at) VALUES (?,'JOB_LOCAL_RECEIPT','PENDING',?,?)")
      .run(id,"job:"+jobId,now);
    return id;
  }).immediate();
}
export function reserveLocalOutbox(sqlite: Database.Database, owner: string, now: number): string | null {
  time(now);
  if (!validId(owner)) throw new Error("Invalid owner");
  return sqlite.transaction(() => {
    const row = sqlite.prepare("SELECT id FROM outbox WHERE state='PENDING' ORDER BY created_at,id LIMIT 1").get() as {id:string}|undefined;
    if (!row) return null;
    const updated = sqlite.prepare("UPDATE outbox SET state='RESERVED',reserved_at=?,lease_owner=? WHERE id=? AND state='PENDING'")
      .run(now,owner,row.id);
    if (updated.changes !== 1) throw new Error("Outbox reservation lost");
    return row.id;
  }).immediate();
}
export function acknowledgeLocalOutbox(sqlite: Database.Database, id: string, owner: string, receiptVerified: boolean): void {
  if (!validId(id) || !validId(owner) || receiptVerified !== true) throw new Error("Verified local receipt required");
  const result = sqlite.prepare("UPDATE outbox SET state='ACKED',lease_owner=NULL WHERE id=? AND state='RESERVED' AND lease_owner=?").run(id,owner);
  if (result.changes !== 1) throw new Error("Outbox reservation mismatch");
}
export function quarantineLocalOutbox(sqlite: Database.Database, now: number, timeout: number): number {
  time(now);
  if (!Number.isSafeInteger(timeout) || timeout < 1 || timeout > 300000) throw new Error("Invalid outbox timeout");
  return sqlite.prepare("UPDATE outbox SET state='UNCERTAIN',lease_owner=NULL WHERE state='RESERVED' AND reserved_at<=?")
    .run(now-timeout).changes;
}
export function reconcileLocalOutbox(sqlite: Database.Database, id: string, observation: "RECEIPT_VERIFIED" | "CONFIRMED_NOT_DELIVERED"): string {
  if (!validId(id)) throw new Error("Invalid outbox id");
  const state = observation === "RECEIPT_VERIFIED" ? "ACKED" : "PENDING";
  const result = sqlite.prepare("UPDATE outbox SET state=?,reserved_at=NULL,lease_owner=NULL WHERE id=? AND state='UNCERTAIN'")
    .run(state,id);
  if (result.changes !== 1) throw new Error("Outbox not uncertain");
  return state;
}
export function getOutboxState(sqlite: Database.Database,id: string): string | null {
  if (!validId(id)) throw new Error("Invalid id");
  const row = sqlite.prepare("SELECT state FROM outbox WHERE id=?").get(id) as {state:string}|undefined;
  return row?.state ?? null;
}
/** Offline-only bounded worker. Handler is a test fake, never a production Official transport. */
export async function runOfflineFixtureWorker(sqlite: Database.Database, options: {
  owner:string;now:number;maxJobs:number;leaseMs:number;
  fakeHandle:(job: Readonly<{id:string;kind:string;bookId:string;planHash:string}>)=>Promise<Completion>;
}): Promise<Array<{id:string;state:string}>> {
  time(options.now);
  if (!Number.isSafeInteger(options.maxJobs) || options.maxJobs < 1 || options.maxJobs > 10 ||
      typeof options.fakeHandle !== "function") throw new Error("Invalid offline worker configuration");
  recoverExpiredLeases(sqlite,options.now);
  const result: Array<{id:string;state:string}> = [];
  for (let n=0;n<options.maxJobs;n++) {
    const job = claimDuePlan(sqlite,options.owner,options.now,options.leaseMs);
    if (!job) break;
    let completion: Completion;
    try {
      completion = await options.fakeHandle({id:job.id,kind:job.kind,bookId:job.book_id,planHash:job.plan_hash});
    } catch {
      // A callback may throw after dispatch. Never guess whether a write happened.
      completion = {type:"POST_OUTCOME_UNKNOWN",code:"PROCESS_INTERRUPTED"};
    }
    const step = job.kind === "COVER_MOCK" ? "COVER" : "METADATA";
    const state = completeExclusiveClaim(sqlite,job.id,options.owner,options.now,completion,step);
    result.push({id:job.id,state});
  }
  return result;
}
