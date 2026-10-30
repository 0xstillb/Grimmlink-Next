import { readFileSync } from "node:fs";
import Database from "better-sqlite3";
import { expect, it } from "vitest";
import { getOutboxState, reconcileLocalOutbox, reserveLocalOutbox } from "./phase04-queue.js";
import {
  claimDuePlan,
  controlPendingPlan,
  enqueueDurablePlan,
  getJobSnapshot,
  reconcileUnknownPlan,
  retryFailedPlan,
  settleClaim,
} from "./recovery-jobs.js";

function fixtureDatabase() {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  for (const name of [
    "0001_foundation.sql",
    "0002_phase04_recovery.sql",
    "0003_phase04_closure.sql",
  ]) {
    sqlite.exec(readFileSync(new URL(`../migrations/${name}`, import.meta.url), "utf8"));
  }
  return sqlite;
}

it("keeps an uncertain outbox quarantined when reconciliation evidence is invalid", () => {
  const sqlite = fixtureDatabase();
  try {
    sqlite
      .prepare(
        "INSERT INTO outbox(id,event_type,state,idempotency_key,created_at) VALUES ('o1','JOB_LOCAL_RECEIPT','UNCERTAIN','k',1)",
      )
      .run();
    for (const invalid of [null, false, "", "UNKNOWN", "CONFIRMED_NOT_DELIVERED_typo"]) {
      expect(() => reconcileLocalOutbox(sqlite, "o1", invalid as never)).toThrow(
        "Invalid outbox reconciliation evidence",
      );
      expect(getOutboxState(sqlite, "o1")).toBe("UNCERTAIN");
      expect(reserveLocalOutbox(sqlite, "worker", 10)).toBeNull();
    }
    expect(reconcileLocalOutbox(sqlite, "o1", "CONFIRMED_NOT_DELIVERED")).toBe("PENDING");
  } finally {
    sqlite.close();
  }
});

it("does not make an unknown job retryable from an unrecognised observation", () => {
  const sqlite = fixtureDatabase();
  try {
    enqueueDurablePlan(sqlite, {
      id: "j1",
      kind: "METADATA_MOCK",
      bookId: "b1",
      planHash: "a".repeat(64),
      idempotencyKey: "k1",
      now: 1,
      maxAttempts: 2,
    });
    expect(claimDuePlan(sqlite, "worker", 2, 1000)?.id).toBe("j1");
    expect(
      settleClaim(sqlite, "j1", "worker", 3, { type: "POST_OUTCOME_UNKNOWN", code: "TIMEOUT" }),
    ).toBe("UNKNOWN");
    for (const invalid of [null, {}, { type: "UNKNOWN" }, { type: "CONFIRMED_NOT_APPLIED_typo" }]) {
      expect(() => reconcileUnknownPlan(sqlite, "j1", 4, invalid as never)).toThrow(
        "Invalid reconciliation evidence",
      );
      expect(getJobSnapshot(sqlite, "j1")).toMatchObject({ state: "UNKNOWN" });
      expect(() => retryFailedPlan(sqlite, "j1", 5)).toThrow("Only failed jobs");
    }
    expect(reconcileUnknownPlan(sqlite, "j1", 6, { type: "CONFIRMED_NOT_APPLIED" })).toBe("FAILED");
  } finally {
    sqlite.close();
  }
});

it("does not resume a paused plan for an invalid control action", () => {
  const sqlite = fixtureDatabase();
  try {
    enqueueDurablePlan(sqlite, {
      id: "j1",
      kind: "METADATA_MOCK",
      bookId: "b1",
      planHash: "a".repeat(64),
      idempotencyKey: "k1",
      now: 1,
      maxAttempts: 2,
    });
    controlPendingPlan(sqlite, "j1", 2, "PAUSE");
    expect(() => controlPendingPlan(sqlite, "j1", 3, "unexpected" as never)).toThrow(
      "Invalid plan action",
    );
    expect(getJobSnapshot(sqlite, "j1")).toMatchObject({ paused: 1, state: "PENDING" });
    expect(claimDuePlan(sqlite, "worker", 4, 1000)).toBeNull();
  } finally {
    sqlite.close();
  }
});

it("quarantines malformed dispatch results instead of making them retryable", () => {
  const sqlite = fixtureDatabase();
  try {
    enqueueDurablePlan(sqlite, {
      id: "j1",
      kind: "METADATA_MOCK",
      bookId: "b1",
      planHash: "a".repeat(64),
      idempotencyKey: "k1",
      now: 1,
      maxAttempts: 2,
    });
    expect(claimDuePlan(sqlite, "worker", 2, 1000)?.id).toBe("j1");
    expect(
      settleClaim(sqlite, "j1", "worker", 3, {
        type: "FAILED_BEFORE_DISPATCH",
        code: "TIMEOUT",
      } as never),
    ).toBe("UNKNOWN");
    expect(getJobSnapshot(sqlite, "j1")).toMatchObject({
      state: "UNKNOWN",
      last_code: "INVALID_OUTCOME",
    });
    expect(() => retryFailedPlan(sqlite, "j1", 4)).toThrow("Only failed jobs");
  } finally {
    sqlite.close();
  }
});
