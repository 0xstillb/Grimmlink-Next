import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { claimJob, openLocalStore } from "./index.js";

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
});
