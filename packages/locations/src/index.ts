import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { lstat, open, readlink, realpath } from "node:fs/promises";
import { isAbsolute, join, posix, relative, resolve, sep } from "node:path";

export type NasLocationPlan = Readonly<{ relativePath: string; access: "UNVERIFIED_READ_ONLY" }>;
/** Reject unsafe lexical paths before touching the filesystem. */
export function planReadOnlyLocation(relativePath: string): NasLocationPlan {
  if (
    typeof relativePath !== "string" ||
    relativePath.length === 0 ||
    relativePath.length > 1024 ||
    /[\\\x00-\x1f\x7f]/.test(relativePath) ||
    isAbsolute(relativePath) ||
    /^[A-Za-z]:/.test(relativePath) ||
    relativePath.split("/").some((segment) => !segment || segment === "." || segment === "..")
  ) {
    throw new Error("Unsafe NAS relative path");
  }
  // Relative NAS identities use slash separators on every development host.
  // Native Windows normalization would turn a valid identity into a backslash
  // path that subsequent OPF and identity validation rejects.
  const clean = posix.normalize(relativePath);
  if (clean.startsWith("../") || clean === "..") throw new Error("Unsafe NAS relative path");
  return Object.freeze({ relativePath: clean, access: "UNVERIFIED_READ_ONLY" });
}

export interface NasFixtureRead {
  readonly relativePath: string;
  readonly bytes: Buffer;
  readonly sha256: string;
  readonly size: number;
  readonly access: "OFFLINE_FIXTURE_READ_ONLY";
}

/**
 * Linux-only, bounded offline fixture reader. No write flags or network paths.
 * This is NOT a production NAS mount/rename-race proof (requires openat2 or
 * equivalent dirfd-anchored traversal and an independently verified RO mount).
 */
export async function readNasFixtureFile(
  fixtureRoot: string,
  relativePath: string,
  maxBytes = 8 * 1024 * 1024,
): Promise<NasFixtureRead> {
  const plan = planReadOnlyLocation(relativePath);
  if (process.platform !== "linux") throw new Error("Linux fixture reader only");
  if (
    !isAbsolute(fixtureRoot) ||
    !Number.isSafeInteger(maxBytes) ||
    maxBytes < 1 ||
    maxBytes > 16 * 1024 * 1024
  )
    throw new Error("Invalid fixture read configuration");

  const root = resolve(fixtureRoot);
  const rootInfo = await lstat(root);
  if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink() || (await realpath(root)) !== root)
    throw new Error("Untrusted fixture root");
  const full = resolve(root, plan.relativePath);
  const containment = relative(root, full);
  if (
    !containment ||
    containment === ".." ||
    containment.startsWith(".." + sep) ||
    isAbsolute(containment)
  )
    throw new Error("Untrusted fixture path");

  let current = root;
  const segments = plan.relativePath.split("/");
  for (const [index, segment] of segments.entries()) {
    current = join(current, segment);
    const item = await lstat(current);
    if (
      item.isSymbolicLink() ||
      (index < segments.length - 1 && !item.isDirectory()) ||
      (index === segments.length - 1 && (!item.isFile() || item.nlink !== 1))
    ) {
      throw new Error("Unsafe fixture entry");
    }
  }
  const before = await lstat(full);
  if (before.size > maxBytes) throw new Error("Fixture exceeds byte limit");
  const handle = await open(full, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const opened = await handle.stat();
    const actual = await readlink(`/proc/self/fd/${handle.fd}`);
    if (
      actual !== full ||
      !opened.isFile() ||
      opened.nlink !== 1 ||
      opened.dev !== before.dev ||
      opened.ino !== before.ino ||
      opened.size !== before.size ||
      opened.size > maxBytes
    ) {
      throw new Error("Fixture changed during open");
    }
    const bytes = Buffer.alloc(opened.size);
    let offset = 0;
    while (offset < bytes.length) {
      const { bytesRead } = await handle.read(bytes, offset, bytes.length - offset, offset);
      if (bytesRead === 0) throw new Error("Fixture truncated");
      offset += bytesRead;
    }
    const probe = Buffer.alloc(1);
    if ((await handle.read(probe, 0, 1, bytes.length)).bytesRead !== 0)
      throw new Error("Fixture grew during read");
    const after = await handle.stat();
    if (
      after.dev !== opened.dev ||
      after.ino !== opened.ino ||
      after.size !== opened.size ||
      after.mtimeMs !== opened.mtimeMs ||
      after.ctimeMs !== opened.ctimeMs ||
      (await realpath(root)) !== root
    )
      throw new Error("Fixture changed during read");
    return Object.freeze({
      relativePath: plan.relativePath,
      bytes,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      size: bytes.length,
      access: "OFFLINE_FIXTURE_READ_ONLY" as const,
    });
  } finally {
    await handle.close();
  }
}
