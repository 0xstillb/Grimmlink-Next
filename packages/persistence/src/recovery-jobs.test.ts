import { expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { openLocalStore } from "./index.js";
import {
  claimDuePlan,
  controlPendingPlan,
  enqueueDurablePlan,
  getJobSnapshot,
  listDurableJobs,
  reconcileUnknownPlan,
  recoverExpiredLeases,
  replayJobEvents,
  retryFailedPlan,
  settleClaim,
} from "./recovery-jobs.js";
const migrations = resolve(fileURLToPath(new URL("../migrations", import.meta.url)));
const hash = "a".repeat(64);
it("survives process restart, quarantines uncertain writes and replays durable events", () => {
  const dir = mkdtempSync(join(tmpdir(), "grimmlink-phase04-jobs-"));
  try {
    const path = join(dir, "db.sqlite");
    let store = openLocalStore(path, migrations);
    const item = {
      id: "job1",
      bookId: "book1",
      kind: "METADATA_MOCK" as const,
      idempotencyKey: "key1",
      planHash: hash,
      now: 10,
    };
    expect(enqueueDurablePlan(store.sqlite, item)).toBe("job1");
    expect(enqueueDurablePlan(store.sqlite, item)).toBe("job1");
    expect(listDurableJobs(store.sqlite)).toEqual([
      {
        id: "job1",
        kind: "METADATA_MOCK",
        state: "PENDING",
        paused: false,
        attempts: 0,
        maxAttempts: 3,
        dueAt: 10,
        lastCode: null,
        createdAt: 10,
        updatedAt: 10,
      },
    ]);
    expect(JSON.stringify(listDurableJobs(store.sqlite))).not.toContain(hash);
    expect(Object.keys(listDurableJobs(store.sqlite)[0]!)).not.toContain("book_id");
    expect(() => listDurableJobs(store.sqlite, 101)).toThrow("limit");
    expect(() => enqueueDurablePlan(store.sqlite, { ...item, bookId: "another" })).toThrow(
      "conflicts",
    );
    expect(claimDuePlan(store.sqlite, "w1", 20, 1000)?.id).toBe("job1");
    expect(claimDuePlan(store.sqlite, "w2", 22, 1000)).toBeNull();
    store.close(); // simulated worker process crash
    store = openLocalStore(path, migrations);
    expect(recoverExpiredLeases(store.sqlite, 1021)).toBe(1);
    expect(claimDuePlan(store.sqlite, "w2", 1022, 1000)).toBeNull();
    expect(getJobSnapshot(store.sqlite, "job1")).toMatchObject({ state: "UNKNOWN" });
    expect(() =>
      reconcileUnknownPlan(store.sqlite, "job1", 1023, {
        type: "MATCHING_READBACK",
        observedHash: "b".repeat(64),
      }),
    ).toThrow();
    expect(
      reconcileUnknownPlan(store.sqlite, "job1", 1024, { type: "CONFIRMED_NOT_APPLIED" }),
    ).toBe("FAILED");
    const next = retryFailedPlan(store.sqlite, "job1", 1025);
    expect(next).toBeGreaterThan(1025);
    expect(claimDuePlan(store.sqlite, "w2", next, 1000)?.id).toBe("job1");
    expect(() =>
      settleClaim(store.sqlite, "job1", "w1", next + 1, {
        type: "READBACK_MATCH",
        observedHash: hash,
      }),
    ).toThrow();
    expect(
      settleClaim(store.sqlite, "job1", "w2", next + 1, {
        type: "POST_OUTCOME_UNKNOWN",
        code: "TIMEOUT",
      }),
    ).toBe("UNKNOWN");
    expect(
      reconcileUnknownPlan(store.sqlite, "job1", next + 2, {
        type: "MATCHING_READBACK",
        observedHash: hash,
      }),
    ).toBe("DONE");
    expect(replayJobEvents(store.sqlite, 0).length).toBeGreaterThanOrEqual(7);
    expect(replayJobEvents(store.sqlite, 2)[0]?.seq).toBe(3);
    store.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
it("models fake NAS/Official outages, pause/resume and no silent success from HTTP 200", () => {
  const dir = mkdtempSync(join(tmpdir(), "grimmlink-phase04-offline-"));
  try {
    const store = openLocalStore(join(dir, "db.sqlite"), migrations);
    enqueueDurablePlan(store.sqlite, {
      id: "j1",
      kind: "COVER_MOCK",
      bookId: "b",
      planHash: hash,
      idempotencyKey: "k",
      now: 100,
      maxAttempts: 2,
    });
    controlPendingPlan(store.sqlite, "j1", 101, "PAUSE");
    expect(claimDuePlan(store.sqlite, "w", 102, 1000)).toBeNull();
    controlPendingPlan(store.sqlite, "j1", 103, "RESUME");
    expect(claimDuePlan(store.sqlite, "w", 104, 1000)?.id).toBe("j1");
    expect(() =>
      settleClaim(store.sqlite, "j1", "w", 105, {
        type: "READBACK_MATCH",
        observedHash: "b".repeat(64),
      }),
    ).toThrow("readback");
    expect(
      settleClaim(store.sqlite, "j1", "w", 105, {
        type: "FAILED_BEFORE_DISPATCH",
        code: "NAS_OFFLINE",
      }),
    ).toBe("FAILED");
    const due = retryFailedPlan(store.sqlite, "j1", 106);
    expect(claimDuePlan(store.sqlite, "w", due, 1000)?.id).toBe("j1");
    expect(
      settleClaim(store.sqlite, "j1", "w", due + 1, {
        type: "FAILED_BEFORE_DISPATCH",
        code: "OFFICIAL_OFFLINE",
      }),
    ).toBe("FAILED");
    expect(() => retryFailedPlan(store.sqlite, "j1", due + 2)).toThrow("attempts");
    store.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
