import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { constants, copyFileSync, existsSync, mkdirSync, renameSync, rmSync, statSync } from "node:fs";
import { randomUUID } from "node:crypto";
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

/**
 * SQLite online backup API captures a consistent snapshot even in WAL mode.
 * Never overwrites an existing destination; intended only for local adapter DB.
 */
export async function createVerifiedBackup(sqlite: Database.Database, target: string): Promise<string> {
  const finalPath = resolve(target);
  if (existsSync(finalPath)) throw new Error("Backup destination already exists");
  mkdirSync(dirname(finalPath), { recursive: true, mode: 0o700 });
  const tmp = finalPath + "." + randomUUID() + ".partial";
  try {
    await sqlite.backup(tmp);
    verifySqliteFile(tmp);
    if (existsSync(finalPath)) throw new Error("Backup destination already exists");
    renameSync(tmp, finalPath);
    return finalPath;
  } catch (error) {
    rmSync(tmp, { force: true });
    throw error;
  }
}

/** Verify, then restore to NEW local path only, never overwrite or replace live DB. */
export function restoreBackupToNewLocation(backup: string, destination: string): string {
  const source = resolve(backup);
  const target = resolve(destination);
  if (source === target || existsSync(target)) throw new Error("Restore requires a new destination");
  verifySqliteFile(source);
  mkdirSync(dirname(target), { recursive: true, mode: 0o700 });
  // COPYFILE_EXCL is atomic creation: do not clobber a concurrently created DB.
  copyFileSync(source, target, constants.COPYFILE_EXCL);
  try {
    verifySqliteFile(target);
    return target;
  } catch (error) {
    rmSync(target, { force: true });
    throw error;
  }
}

function verifySqliteFile(path: string): void {
  if (!statSync(path).isFile()) throw new Error("Expected SQLite file");
  const db = new Database(path, { readonly: true, fileMustExist: true });
  try {
    const result = db.pragma("integrity_check(1)", { simple: true });
    if (result !== "ok") throw new Error("SQLite backup integrity check failed");
    const found = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='jobs'").get();
    if (!found) throw new Error("SQLite backup missing adapter schema");
  } finally {
    db.close();
  }
}
