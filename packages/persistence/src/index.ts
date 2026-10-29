import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { constants, chmodSync, closeSync, existsSync, fsyncSync, linkSync, lstatSync, mkdirSync, openSync, readSync, rmSync, writeSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname, join, parse, resolve, sep } from "node:path";
import * as schema from "./schema.js";
export * from "./schema.js";

export interface LocalStore { sqlite: Database.Database; orm: BetterSQLite3Database<typeof schema>; close: () => void; }

/**
 * Walk paths one component at a time; never traverse symlinks or create a
 * child through them. Existing public ancestors such as /tmp are allowed,
 * but the immediate SQLite data directory must be private and process-owned.
 */
function preparePrivateDirectory(parent: string): void {
  const absolute = resolve(parent);
  const root = parse(absolute).root;
  let cursor = root;
  for (const component of absolute.slice(root.length).split(sep).filter(Boolean)) {
    cursor = join(cursor, component);
    let entry;
    try {
      entry = lstatSync(cursor);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      mkdirSync(cursor, { mode: 0o700 }); // no recursive traversal of unknown links
      entry = lstatSync(cursor);
    }
    if (!entry.isDirectory()) {
      throw new Error("Local SQLite directory must not contain symlinks");
    }
  }
  const directory = lstatSync(absolute);
  if ((directory.mode & 0o077) !== 0 ||
      (typeof process.getuid === "function" && directory.uid !== process.getuid())) {
    throw new Error("Local SQLite directory must be private (0700) and owned by the process");
  }
}

export function openLocalStore(filePath: string, migrationsFolder: string): LocalStore {
  if (filePath === ":memory:") throw new Error("Persistent local SQLite path required");
  const path = resolve(filePath);
  const parent = dirname(path);
  preparePrivateDirectory(parent);
  // SQLite may create its DB with umask-dependent 0644 rights by default.
  // Fail closed on shared directories and links before any migration/write.
  try {
    const fd = openSync(path, constants.O_CREAT | constants.O_EXCL | constants.O_RDWR | constants.O_NOFOLLOW, 0o600);
    closeSync(fd);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }
  const file = lstatSync(path);
  if (!file.isFile() || (file.mode & 0o077) !== 0 || file.nlink !== 1) {
    throw new Error("Local SQLite file must be regular, private (0600), and unlinked");
  }
  const sqlite = new Database(path, { timeout: 5000, fileMustExist: true });
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
  if (!Number.isSafeInteger(now + ttlMs)) throw new Error("Lease expiry out of range");
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
  preparePrivateDirectory(dirname(finalPath));
  const tmp = finalPath + "." + randomUUID() + ".partial";
  try {
    // Create private temp inode BEFORE writing SQLite pages. A later chmod
    // would leave a possible world-readable window under permissive umask.
    const tempFd = openSync(tmp, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600);
    closeSync(tempFd);
    await sqlite.backup(tmp);
    verifySqliteFile(tmp);
    chmodSync(tmp, 0o600);
    // Hard-link creation fails if a destination exists, even a dangling symlink.
    linkSync(tmp, finalPath);
    rmSync(tmp);
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
  preparePrivateDirectory(dirname(target));
  // Both destination exclusivity and 0600 permissions are enforced at CREATE,
  // not after copying potentially sensitive SQLite pages.
  const sourceFd = openSync(source, constants.O_RDONLY | constants.O_NOFOLLOW);
  let targetFd: number | undefined;
  let created = false;
  try {
    targetFd = openSync(target, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600);
    created = true;
    const chunk = Buffer.allocUnsafe(64 * 1024);
    while (true) {
      const bytesRead = readSync(sourceFd, chunk, 0, chunk.length, null);
      if (bytesRead === 0) break;
      let offset = 0;
      while (offset < bytesRead) {
        const written = writeSync(targetFd, chunk, offset, bytesRead - offset);
        if (written <= 0) throw new Error("SQLite restore copy made no progress");
        offset += written;
      }
    }
    fsyncSync(targetFd);
    closeSync(targetFd);
    targetFd = undefined;
    verifySqliteFile(target);
    return target;
  } catch (error) {
    if (targetFd !== undefined) closeSync(targetFd);
    if (created) rmSync(target, { force: true });
    throw error;
  } finally {
    closeSync(sourceFd);
  }
}

function verifySqliteFile(path: string): void {
  if (!lstatSync(path).isFile()) throw new Error("Expected SQLite file");
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
