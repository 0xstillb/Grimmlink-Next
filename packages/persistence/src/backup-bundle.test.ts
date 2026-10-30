import { expect, it } from "vitest";
import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildMetadataBundle,
  previewMetadataRestore,
  readMetadataBundleFile,
  writeMetadataBundleFile,
} from "./backup-bundle.js";
it("creates a physically verified local manifest and refuses overwrite/tampering", () => {
  const dir = mkdtempSync(join(tmpdir(), "grimmlink-phase04-bundle-"));
  try {
    const path = join(dir, "b1.json");
    const bundle = buildMetadataBundle([{ bookId: "book-1", metadata: { title: "Hello" } }], 100);
    expect(writeMetadataBundleFile(path, bundle)).toBe(path);
    expect(statSync(path).mode & 0o777).toBe(0o600);
    expect(readMetadataBundleFile(path).sha256).toBe(bundle.sha256);
    expect(previewMetadataRestore(bundle).writesAllowed).toBe(false);
    expect(() => writeMetadataBundleFile(path, bundle)).toThrow();
    const raw = readFileSync(path, "utf8").replace("Hello", "Changed");
    writeFileSync(path, raw);
    expect(() => readMetadataBundleFile(path)).toThrow("mismatch");
    expect(() =>
      buildMetadataBundle([{ bookId: "book-1", metadata: { secret: "private" } }], 100),
    ).toThrow();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
it("rejects symlinks and non-private bundle directory", () => {
  const dir = mkdtempSync(join(tmpdir(), "grimmlink-phase04-private-"));
  try {
    const bundle = buildMetadataBundle([{ bookId: "b1", metadata: { title: "A" } }], 1);
    const link = join(dir, "redirect.json");
    symlinkSync(join(dir, "missing.json"), link);
    expect(() => writeMetadataBundleFile(link, bundle)).toThrow();
    chmodSync(dir, 0o755);
    expect(() => writeMetadataBundleFile(join(dir, "backup.json"), bundle)).toThrow("private");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
