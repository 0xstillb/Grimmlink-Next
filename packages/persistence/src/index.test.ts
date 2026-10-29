import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, statSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { claimJob, openLocalStore, createVerifiedBackup, restoreBackupToNewLocation } from "./index.js";

const migrations = resolve(fileURLToPath(new URL("../migrations", import.meta.url)));
describe("local durable SQLite", () => {
  it("migrates WAL schema and preserves job uniqueness and atomic lease", () => {
    const dir = mkdtempSync(join(tmpdir(), "grimmlink-p01-"));
    try {
      const store = openLocalStore(join(dir,"test.sqlite"), migrations);
      expect(store.sqlite.pragma("journal_mode", { simple:true })).toBe("wal");
      const insert = store.sqlite.prepare("INSERT INTO jobs(id,kind,idempotency_key,created_at) VALUES (?,?,?,?)");
      insert.run("j1","local-only","dedupe-1",100);
      expect(() => insert.run("j2","local-only","dedupe-1",101)).toThrow();
      expect(claimJob(store.sqlite,"worker-a",200,1000)).toBe("j1");
      expect(claimJob(store.sqlite,"worker-b",201,1000)).toBeNull();
      expect(claimJob(store.sqlite,"worker-b",1200,1000)).toBe("j1");
      store.close();
    } finally { rmSync(dir, { recursive:true, force:true }); }
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
      store.close();
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
});
