import { expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { openLocalStore } from "./index.js";
import {
  enqueueExclusivePlan,
  completeExclusiveClaim,
  reconcileExclusiveUnknown,
  cancelExclusivePlan,
  getJobStepReceipts,
  enqueueLocalOutbox,
  reserveLocalOutbox,
  acknowledgeLocalOutbox,
  quarantineLocalOutbox,
  reconcileLocalOutbox,
  getOutboxState,
  runOfflineFixtureWorker,
} from "./phase04-queue.js";
import { claimDuePlan, recoverExpiredLeases, retryFailedPlan } from "./recovery-jobs.js";
const migrations = resolve(fileURLToPath(new URL("../migrations", import.meta.url)));
const h = "a".repeat(64);
it("locks one plan per book, durable receipts, no accidental retry of unknown", async () => {
  const dir = mkdtempSync(join(tmpdir(), "phase04-closure-"));
  try {
    const path = join(dir, "jobs.db");
    let store = openLocalStore(path, migrations);
    const p = {
      id: "j1",
      kind: "METADATA_MOCK" as const,
      bookId: "book-1",
      idempotencyKey: "k1",
      planHash: h,
      now: 100,
    };
    expect(enqueueExclusivePlan(store.sqlite, p)).toBe("j1");
    expect(enqueueExclusivePlan(store.sqlite, p)).toBe("j1");
    expect(() =>
      enqueueExclusivePlan(store.sqlite, { ...p, id: "j2", idempotencyKey: "k2" }),
    ).toThrow("lock");
    const first = claimDuePlan(store.sqlite, "w1", 101, 1000);
    expect(first?.id).toBe("j1");
    store.close();
    store = openLocalStore(path, migrations);
    expect(recoverExpiredLeases(store.sqlite, 1102)).toBe(1);
    expect(claimDuePlan(store.sqlite, "w2", 1103, 1000)).toBeNull();
    expect(() =>
      enqueueExclusivePlan(store.sqlite, { ...p, id: "j2", idempotencyKey: "k2" }),
    ).toThrow();
    expect(
      reconcileExclusiveUnknown(
        store.sqlite,
        "j1",
        1104,
        { type: "MATCHING_READBACK", observedHash: h },
        "METADATA",
      ),
    ).toBe("DONE");
    expect(getJobStepReceipts(store.sqlite, "j1")).toMatchObject([
      { step: "METADATA", status: "VERIFIED", fingerprint: h },
    ]);
    expect(
      enqueueExclusivePlan(store.sqlite, { ...p, id: "j2", idempotencyKey: "k2", now: 1105 }),
    ).toBe("j2");
    expect(claimDuePlan(store.sqlite, "w2", 1106, 1000)?.id).toBe("j2");
    expect(
      completeExclusiveClaim(store.sqlite, "j2", "w2", 1107, {
        type: "FAILED_BEFORE_DISPATCH",
        code: "NAS_OFFLINE",
      }),
    ).toBe("FAILED");
    const due = retryFailedPlan(store.sqlite, "j2", 1108);
    expect(claimDuePlan(store.sqlite, "w2", due, 1000)?.id).toBe("j2");
    expect(
      completeExclusiveClaim(
        store.sqlite,
        "j2",
        "w2",
        due + 1,
        { type: "READBACK_MATCH", observedHash: h },
        "METADATA",
      ),
    ).toBe("DONE");
    expect(getJobStepReceipts(store.sqlite, "j2")).toHaveLength(1);
    store.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
it("outbox survives restart, uncertain never auto-retries and requires explicit reconciliation", () => {
  const dir = mkdtempSync(join(tmpdir(), "phase04-outbox-"));
  try {
    const p = join(dir, "outbox.db");
    let store = openLocalStore(p, migrations);
    enqueueExclusivePlan(store.sqlite, {
      id: "job",
      kind: "COVER_MOCK",
      bookId: "book",
      idempotencyKey: "one",
      planHash: h,
      now: 10,
    });
    expect(enqueueLocalOutbox(store.sqlite, "o1", "job", 11)).toBe("o1");
    expect(enqueueLocalOutbox(store.sqlite, "o2", "job", 12)).toBe("o1");
    expect(reserveLocalOutbox(store.sqlite, "worker", 12)).toBe("o1");
    store.close();
    store = openLocalStore(p, migrations);
    expect(quarantineLocalOutbox(store.sqlite, 1020, 1000)).toBe(1);
    expect(getOutboxState(store.sqlite, "o1")).toBe("UNCERTAIN");
    expect(reserveLocalOutbox(store.sqlite, "worker", 1021)).toBeNull();
    expect(() => acknowledgeLocalOutbox(store.sqlite, "o1", "worker", true)).toThrow();
    expect(reconcileLocalOutbox(store.sqlite, "o1", "RECEIPT_VERIFIED")).toBe("ACKED");
    expect(reserveLocalOutbox(store.sqlite, "worker", 1022)).toBeNull();
    store.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
it("bounded mock worker classifies fake faults and releases verified locks only", async () => {
  const dir = mkdtempSync(join(tmpdir(), "phase04-worker-"));
  try {
    const store = openLocalStore(join(dir, "db.sqlite"), migrations);
    enqueueExclusivePlan(store.sqlite, {
      id: "j1",
      kind: "METADATA_MOCK",
      bookId: "b1",
      idempotencyKey: "i1",
      planHash: h,
      now: 10,
    });
    enqueueExclusivePlan(store.sqlite, {
      id: "j2",
      kind: "COVER_MOCK",
      bookId: "b2",
      idempotencyKey: "i2",
      planHash: h,
      now: 10,
    });
    const results = await runOfflineFixtureWorker(store.sqlite, {
      owner: "worker",
      now: 12,
      leaseMs: 1000,
      maxJobs: 2,
      fakeHandle: async (job) =>
        job.id === "j1"
          ? { type: "READBACK_MATCH", observedHash: h }
          : { type: "POST_OUTCOME_UNKNOWN", code: "TIMEOUT" },
    });
    expect(results).toEqual([
      { id: "j1", state: "DONE" },
      { id: "j2", state: "UNKNOWN" },
    ]);
    expect(getJobStepReceipts(store.sqlite, "j1")[0]?.step).toBe("METADATA");
    expect(getJobStepReceipts(store.sqlite, "j2")).toHaveLength(0);
    expect(
      await runOfflineFixtureWorker(store.sqlite, {
        owner: "worker",
        now: 3012,
        leaseMs: 1000,
        maxJobs: 2,
        fakeHandle: async () => {
          throw Error("must not dispatch");
        },
      }),
    ).toEqual([]);
    expect(
      reconcileExclusiveUnknown(
        store.sqlite,
        "j2",
        3013,
        { type: "MATCHING_READBACK", observedHash: h },
        "COVER",
      ),
    ).toBe("DONE");
    enqueueExclusivePlan(store.sqlite, {
      id: "j3",
      kind: "METADATA_MOCK",
      bookId: "b3",
      idempotencyKey: "i3",
      planHash: h,
      now: 3015,
    });
    cancelExclusivePlan(store.sqlite, "j3", 3016);
    expect(claimDuePlan(store.sqlite, "worker", 3017, 1000)).toBeNull();
    store.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
