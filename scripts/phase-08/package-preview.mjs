import { createHash } from "node:crypto";
import { lstat, readFile, readdir, writeFile } from "node:fs/promises";
import { resolve, relative, join } from "node:path";
import { pathToFileURL } from "node:url";

/**
 * Generates a deterministic UI-only local preview manifest.
 * NOT an installable image, signed update or production rollback receipt.
 */
export async function inspectPreviewPackage(root) {
  const base = resolve(root);
  const fileList = [];
  async function visit(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const absolute = join(current, entry.name);
      const info = await lstat(absolute);
      if (info.isSymbolicLink() || !info.isFile() && !info.isDirectory()) {
        throw new Error("UNSAFE_PACKAGE_ENTRY");
      }
      if (info.isDirectory()) {
        await visit(absolute);
        continue;
      }
      const name = relative(base, absolute).replaceAll("\\", "/");
      if (!/^(index\.html|assets\/[a-zA-Z0-9._-]+\.(js|css|svg|png|woff2))$/.test(name)) {
        throw new Error("UNAPPROVED_PACKAGE_FILE");
      }
      if (info.size < 1 || info.size > 20 * 1024 * 1024) {
        throw new Error("INVALID_PACKAGE_FILE_SIZE");
      }
      const bytes = await readFile(absolute);
      fileList.push({
        path: name,
        bytes: bytes.length,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      });
    }
  }
  await visit(base);
  fileList.sort((a, b) => a.path.localeCompare(b.path, "en"));
  if (fileList.length < 2 || fileList.length > 200 || !fileList.some((f) => f.path === "index.html")) {
    throw new Error("INVALID_UI_PACKAGE");
  }
  return {
    schema: "grimmlink.phase08.ui-preview.v1",
    releaseAuthorization: "NOT_AUTHORIZED",
    target: "LOCAL_STATIC_UI_ONLY",
    autoInstall: false,
    rollbackVerified: false,
    files: fileList,
  };
}

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (invokedDirectly) {
  const root = process.argv[2];
  const output = process.argv[3];
  if (!root || !output) throw new Error("USAGE: package-preview.mjs DIST_DIR OUTPUT_JSON");
  const manifest = await inspectPreviewPackage(root);
  await writeFile(resolve(output), JSON.stringify(manifest, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  process.stdout.write("Phase08 UI preview manifest written (NOT_AUTHORIZED)\n");
}
