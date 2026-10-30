import { mkdtemp, mkdir, rm, symlink, writeFile, link } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { planReadOnlyLocation, readNasFixtureFile } from "./index.js";

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((r) => rm(r, { recursive: true, force: true }))); });
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "grimmlink-phase03-"));
  roots.push(root);
  return root;
}
it("rejects absolute, URL-like escape, and dot traversal", () => {
  for (const p of ["../secret", "/root", "./book.opf", "a//b", "a/../b", "C:/x", "a\\b", "foo\u0000bar", "foo\nbar"]) {
    expect(() => planReadOnlyLocation(p)).toThrow();
  }
  expect(planReadOnlyLocation("library/book.opf").access).toBe("UNVERIFIED_READ_ONLY");
});
it("reads bounded offline fixture and reports stable content fingerprint", async () => {
  const root = await fixture();
  await mkdir(join(root, "books"));
  await writeFile(join(root, "books", "a.opf"), "<package/>");
  const v = await readNasFixtureFile(root, "books/a.opf");
  expect(v.access).toBe("OFFLINE_FIXTURE_READ_ONLY");
  expect(v.size).toBe(10);
  expect(v.sha256).toMatch(/^[a-f0-9]{64}$/);
  expect(v.bytes.toString()).toBe("<package/>");
  await expect(readNasFixtureFile(root, "books/a.opf", 2)).rejects.toThrow();
});
it("rejects symlink file, symlink parent and hardlink aliases", async () => {
  const root = await fixture();
  await mkdir(join(root, "books"));
  await writeFile(join(root, "books", "a.opf"), "sample");
  await symlink(join(root, "books", "a.opf"), join(root, "alias.opf"));
  await symlink(join(root, "books"), join(root, "shortcut"));
  await expect(readNasFixtureFile(root, "alias.opf")).rejects.toThrow();
  await expect(readNasFixtureFile(root, "shortcut/a.opf")).rejects.toThrow();
  await link(join(root, "books", "a.opf"), join(root, "copy.opf"));
  await expect(readNasFixtureFile(root, "books/a.opf")).rejects.toThrow();
});
it("never treats directory or missing path as a file", async () => {
  const root = await fixture();
  await mkdir(join(root, "books"));
  await expect(readNasFixtureFile(root, "books")).rejects.toThrow();
  await expect(readNasFixtureFile(root, "missing.opf")).rejects.toThrow();
});
