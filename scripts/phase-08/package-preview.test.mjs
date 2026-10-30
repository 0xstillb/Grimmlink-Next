import { test } from "node:test";
import { strict as assert } from "node:assert";
import { mkdtemp, mkdir, writeFile, symlink, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { inspectPreviewPackage } from "./package-preview.mjs";

test("offline UI manifest is deterministic, honest and byte-hashed", async () => {
  const root = await mkdtemp(join(tmpdir(), "phase08-ui-"));
  try {
    await mkdir(join(root, "assets"));
    await writeFile(join(root, "index.html"), "<html>offline preview</html>");
    await writeFile(join(root, "assets", "ui-123.js"), "console.log('mock only')");
    const a = await inspectPreviewPackage(root);
    const b = await inspectPreviewPackage(root);
    assert.deepEqual(a, b);
    assert.equal(a.releaseAuthorization, "NOT_AUTHORIZED");
    assert.equal(a.autoInstall, false);
    assert.equal(a.rollbackVerified, false);
    assert.equal(a.files.length, 2);
    assert.match(a.files[0].sha256, /^[a-f0-9]{64}$/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects symlinks, unexpected files and empty packages", async () => {
  const root = await mkdtemp(join(tmpdir(), "phase08-ui-"));
  try {
    await mkdir(join(root, "assets"));
    await writeFile(join(root, "index.html"), "<html/>");
    await assert.rejects(inspectPreviewPackage(root), /INVALID_UI_PACKAGE/);
    await writeFile(join(root, "assets", "app.js"), "safe");
    await symlink(join(root, "index.html"), join(root, "assets", "alias.js"));
    await assert.rejects(inspectPreviewPackage(root), /UNSAFE_PACKAGE_ENTRY/);
    await rm(join(root, "assets", "alias.js"));
    await writeFile(join(root, "credentials.env"), "not a production secret");
    await assert.rejects(inspectPreviewPackage(root), /UNAPPROVED_PACKAGE_FILE/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
