import { describe, expect, it } from "vitest";
import { chmodSync, mkdtempSync, rmSync, statSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { claimJob, openLocalStore, createVerifiedBackup, restoreBackupToNewLocation } from "./index.js";

const migrations = resolve(fileURLToPath(new URL("../migrations", import.meta.url)));
describe("local durable SQLite", () => {
  it("migrates WAL schema and preserves job uniqueness and atomic lease", () => {
    const dir = mkdtempSync(join(tmpdir(), "grimmlink-p01-"));
    try {
      const dbPath = join(dir, "test.sqlite");
      const store = openLocalStore(dbPath, migrations);
      expect(statSync(dbPath).mode & 0o777).toBe(0o600);
      expect(store.sqlite.pragma("journal_mode", { simple:true })).toBe("wal");
      const insert = store.sqlite.prepare("INSERT INTO jobs(id,kind,idempotency_key,created_at) VALUES (?,?,?,?)");
      insert.run("j1","local-only","dedupe-1",100);
      expect(() => insert.run("j2","local-only","dedupe-1",101)).toThrow();
      expect(claimJob(store.sqlite,"worker-a",200,1000)).toBe("j1");
      expect(claimJob(store.sqlite,"worker-b",201,1000)).toBeNull();
      expect(claimJob(store.sqlite,"worker-b",1200,1000)).toBe("j1");
      expect(() => claimJob(store.sqlite, "worker-a", Number.MAX_SAFE_INTEGER, 1000)).toThrow("Lease expiry out of range");
      store.close();
    } finally { rmSync(dir, { recursive:true, force:true }); }
  });
  it("fails closed for symlinked, world-readable or multiply-linked local storage", () => {
    const dir = mkdtempSync(join(tmpdir(), "grimmlink-private-"));
    try {
      const privatePath = join(dir, "private.sqlite");
      const store = openLocalStore(privatePath, migrations);
      store.close();

      const linkedPath = join(dir, "linked.sqlite");
      symlinkSync(privatePath, linkedPath);
      expect(() => openLocalStore(linkedPath, migrations)).toThrow("regular, private");

      chmodSync(privatePath, 0o644);
      expect(() => openLocalStore(privatePath, migrations)).toThrow("regular, private");
      chmodSync(privatePath, 0o600);

      chmodSync(dir, 0o755);
      expect(() => openLocalStore(join(dir, "wrong-dir.sqlite"), migrations)).toThrow("directory must be private");
      chmodSync(dir, 0o700);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it("backs up a live WAL database and restores only to a new path", async () => {
    const dir = mkdtempSync(join(tmpdir(), "grimmlink-backup-"));
    try {
      const dbFile = join(dir, "source.sqlite");
      const store = openLocalStore(dbFile, migrations);
      store.sqlite.prepare("INSERT INTO jobs(id,kind,idempotency_key,created_at) VALUES (?,?,?,?)").run("j1","local","key1",1);
      const backupFile = join(dir, "snapshot.sqlite");
      await createVerifiedBackup(store.sqlite, backupFile);
      expect(statSync(backupFile).mode & 0o777).toBe(0o600);
      await expect(createVerifiedBackup(store.sqlite, backupFile)).rejects.toThrow("already exists");
      // A readable source snapshot must never make the newly created restore readable.
      chmodSync(backupFile, 0o644);
      const restoredFile = join(dir, "restored.sqlite");
      restoreBackupToNewLocation(backupFile, restoredFile);
      expect(statSync(restoredFile).mode & 0o777).toBe(0o600);
      const restored = openLocalStore(restoredFile, migrations);
      expect(restored.sqlite.prepare("SELECT id FROM jobs").get()).toMatchObject({ id:"j1" });
      restored.close();
      expect(() => restoreBackupToNewLocation(backupFile, restoredFile)).toThrow("new destination");
      expect(() => restoreBackupToNewLocation(join(dir, "missing.sqlite"), join(dir, "bad.sqlite"))).toThrow();
      const dangling = join(dir, "dangling.sqlite");
      symlinkSync(join(dir,"nonexistent.sqlite"),dangling);
      await expect(createVerifiedBackup(store.sqlite, dangling)).rejects.toThrow();
      expect(() => restoreBackupToNewLocation(backupFile, dangling)).toThrow();
      expect(() => restoreBackupToNewLocation(dangling, join(dir,"unsafe.sqlite"))).toThrow();
      store.close();
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
});
