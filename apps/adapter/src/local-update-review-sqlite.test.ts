import { createRequire } from "node:module";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import type { LocalStore } from "@grimmlink/persistence";
import {
  createLocalUpdateReviewLedger,
  type UpdateReviewInput,
} from "./local-update-review-sqlite.js";

type TestSqlite = {
  exec: (sql: string) => void;
  prepare: (sql: string) => {
    get: (...args: unknown[]) => unknown;
    run: (...args: unknown[]) => unknown;
  };
  close: () => void;
};
const persistenceRequire = createRequire(
  fileURLToPath(new URL("../../../packages/persistence/package.json", import.meta.url)),
);
const Database = persistenceRequire("better-sqlite3") as new (path: string) => TestSqlite;

const input: UpdateReviewInput = {
  sourceId: "grimmory",
  candidateTag: "v3.5.1",
  evidenceSha256: "a".repeat(64),
  compatibilityManifestSha256: "b".repeat(64),
  compatibility: "UNKNOWN",
  impact: "UNKNOWN",
  decision: "DEFERRED",
  rationale: "Installed runtime versions are unknown; defer until evidence is available.",
};

it("persists owner review records append-only with installation permanently disabled", () => {
  const sqlite = new Database(":memory:");
  const folder = new URL("../../../packages/persistence/migrations/", import.meta.url);
  try {
    for (const name of readdirSync(folder)
      .filter((item) => item.endsWith(".sql"))
      .sort()) {
      sqlite.exec(readFileSync(new URL(name, folder), "utf8"));
    }
    const store = { sqlite, orm: undefined, close: () => sqlite.close() } as unknown as LocalStore;
    const ledger = createLocalUpdateReviewLedger(store, () => 1_798_000_000_000);
    const recorded = ledger.record(input);
    expect(ledger.list()).toEqual([recorded]);
    expect(recorded.installationAllowed).toBe(false);
    expect(() =>
      sqlite
        .prepare("UPDATE update_review_records SET decision = 'REJECTED' WHERE id = ?")
        .run(recorded.id),
    ).toThrow("UPDATE_REVIEW_RECORDS_APPEND_ONLY");
    expect(() =>
      sqlite.prepare("DELETE FROM update_review_records WHERE id = ?").run(recorded.id),
    ).toThrow("UPDATE_REVIEW_RECORDS_APPEND_ONLY");
    expect(() =>
      ledger.record({
        ...input,
        decision: "SUBMIT_FOR_PHASE09_EVALUATION",
        rationale: "Unknown compatibility cannot be submitted for Phase09 evaluation.",
      }),
    ).toThrow("UPDATE_REVIEW_PHASE09_EVIDENCE_REQUIRED");
  } finally {
    sqlite.close();
  }
});
