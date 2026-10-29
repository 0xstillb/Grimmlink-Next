import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import * as schema from "./schema.js";
export * from "./schema.js";

export interface LocalStore { sqlite: Database.Database; orm: BetterSQLite3Database<typeof schema>; close: () => void; }

export function openLocalStore(filePath: string, migrationsFolder: string): LocalStore {
  if (filePath === ":memory:") throw new Error("Persistent local SQLite path required");
  const path = resolve(filePath);
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const sqlite = new Database(path, { timeout: 5000 });
  try {
    sqlite.pragma("busy_timeout = 5000");
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("synchronous = FULL");
    sqlite.pragma("foreign_keys = ON");
    const orm = drizzle(sqlite, { schema });
    // Migration errors abort startup. Never silently run with stale schema.
    migrate(orm, { migrationsFolder });
    return { sqlite, orm, close: () => sqlite.close() };
  } catch (error) {
    sqlite.close();
    throw error;
  }
}

/** Atomic local job reservation. Does not contact any upstream service. */
export function claimJob(sqlite: Database.Database, leaseOwner: string, now: number, ttlMs: number): string | null {
  if (!leaseOwner || !Number.isSafeInteger(now) || !Number.isSafeInteger(ttlMs) || ttlMs <= 0 || ttlMs > 300000) {
    throw new Error("Invalid lease request");
  }
  const tx = sqlite.transaction(() => {
    const row = sqlite.prepare(
      "SELECT id FROM jobs WHERE status = 'PENDING' OR (status = 'LEASED' AND lease_until <= ?) ORDER BY created_at ASC LIMIT 1"
    ).get(now) as { id: string } | undefined;
    if (!row) return null;
    sqlite.prepare(
      "UPDATE jobs SET status = 'LEASED', lease_owner = ?, lease_until = ?, attempt_count = attempt_count + 1 WHERE id = ?"
    ).run(leaseOwner, now + ttlMs, row.id);
    return row.id;
  });
  return tx.immediate();
}
