import { createHash, randomUUID } from "node:crypto";
import {
  constants,
  closeSync,
  fsyncSync,
  linkSync,
  lstatSync,
  openSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, parse, resolve, sep } from "node:path";

export type MetadataSnapshot = Readonly<{
  bookId: string;
  metadata: Readonly<Record<string, string | number>>;
  coverSha256?: string;
}>;
export type MetadataBundle = Readonly<{
  schemaVersion: 1;
  scope: "SINGLE_OWNER_LOCAL_METADATA_ONLY";
  createdAt: number;
  snapshots: readonly MetadataSnapshot[];
  sha256: string;
}>;
const keys = new Set([
  "title",
  "subtitle",
  "publisher",
  "publishedDate",
  "description",
  "seriesName",
  "seriesNumber",
  "isbn10",
  "isbn13",
  "language",
]);
const hash = (input: string): string => createHash("sha256").update(input).digest("hex");
const checkSha = (value: string) => /^[a-f0-9]{64}$/.test(value);
function validateSnapshot(raw: MetadataSnapshot): MetadataSnapshot {
  if (
    !raw ||
    typeof raw.bookId !== "string" ||
    !/^[\w:-]{1,120}$/.test(raw.bookId) ||
    !raw.metadata ||
    typeof raw.metadata !== "object" ||
    Array.isArray(raw.metadata)
  )
    throw new Error("Invalid metadata snapshot");
  const metadata: Record<string, string | number> = {};
  for (const key of Object.keys(raw.metadata).sort()) {
    if (!keys.has(key)) throw new Error("Unsupported metadata backup field");
    const value = raw.metadata[key];
    if (key === "seriesNumber") {
      if (typeof value !== "number" || !Number.isFinite(value) || value <= 0 || value > 100000)
        throw new Error("Invalid series");
      metadata[key] = value;
    } else {
      if (
        typeof value !== "string" ||
        value.length < 1 ||
        value.length > (key === "description" ? 8192 : 512)
      )
        throw new Error("Invalid scalar");
      metadata[key] = value;
    }
  }
  if (
    raw.coverSha256 !== undefined &&
    (!checkSha(raw.coverSha256) || typeof raw.coverSha256 !== "string")
  )
    throw new Error("Invalid cover fingerprint");
  return raw.coverSha256 === undefined
    ? { bookId: raw.bookId, metadata }
    : { bookId: raw.bookId, metadata, coverSha256: raw.coverSha256 };
}
export function buildMetadataBundle(
  snapshots: readonly MetadataSnapshot[],
  createdAt: number,
): MetadataBundle {
  if (
    !Number.isSafeInteger(createdAt) ||
    createdAt < 0 ||
    snapshots.length < 1 ||
    snapshots.length > 500
  )
    throw new Error("Invalid bundle manifest");
  const seen = new Set<string>();
  const clean = snapshots
    .map((item) => {
      const value = validateSnapshot(item);
      if (seen.has(value.bookId)) throw new Error("Duplicate book snapshot");
      seen.add(value.bookId);
      return value;
    })
    .sort((a, b) => a.bookId.localeCompare(b.bookId, "en"));
  const body = {
    schemaVersion: 1 as const,
    scope: "SINGLE_OWNER_LOCAL_METADATA_ONLY" as const,
    createdAt,
    snapshots: clean,
  };
  return { ...body, sha256: hash(JSON.stringify(body)) };
}
/** Verifies a JSON bundle. No Official writes, text, notes, credentials or cover payloads. */
export function verifyMetadataBundle(value: unknown): MetadataBundle {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Malformed backup bundle");
  const input = value as MetadataBundle;
  if (
    input.schemaVersion !== 1 ||
    input.scope !== "SINGLE_OWNER_LOCAL_METADATA_ONLY" ||
    !Array.isArray(input.snapshots) ||
    !checkSha(input.sha256)
  )
    throw new Error("Unsupported backup manifest");
  const rebuilt = buildMetadataBundle(input.snapshots, input.createdAt);
  if (rebuilt.sha256 !== input.sha256) throw new Error("Backup SHA-256 mismatch");
  return rebuilt;
}
function privateDirectory(path: string) {
  const absolute = resolve(path);
  const root = parse(absolute).root;
  let cursor = root;
  for (const part of absolute.slice(root.length).split(sep).filter(Boolean)) {
    cursor = join(cursor, part);
    if (!lstatSync(cursor).isDirectory())
      throw new Error("Backup path contains symlink or non-directory");
  }
  const st = lstatSync(absolute);
  if (
    (st.mode & 0o077) !== 0 ||
    (typeof process.getuid === "function" && st.uid !== process.getuid())
  )
    throw new Error("Backup directory must be owned and private 0700");
}
function verifyPrivateFile(path: string): void {
  const st = lstatSync(path);
  if (!st.isFile() || st.nlink !== 1 || (st.mode & 0o077) !== 0 || st.size > 1024 * 1024)
    throw new Error("Backup must be private regular bounded file");
}
export function readMetadataBundleFile(path: string): MetadataBundle {
  const filename = resolve(path);
  privateDirectory(dirname(filename));
  verifyPrivateFile(filename);
  const fd = openSync(filename, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const bytes = readFileSync(fd);
    if (bytes.length > 1024 * 1024) throw new Error("Backup exceeds byte limit");
    const data = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return verifyMetadataBundle(JSON.parse(data) as unknown);
  } finally {
    closeSync(fd);
  }
}
/** Persist via exclusive private temp inode, fsync + hard-link publish (no overwrite). */
export function writeMetadataBundleFile(destination: string, bundle: MetadataBundle): string {
  const verified = verifyMetadataBundle(bundle);
  const target = resolve(destination);
  privateDirectory(dirname(target));
  const bytes = Buffer.from(JSON.stringify(verified));
  if (bytes.length > 1024 * 1024) throw new Error("Backup exceeds byte limit");
  const temporary = target + "." + randomUUID() + ".partial";
  let fd: number | undefined;
  try {
    fd = openSync(
      temporary,
      constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW,
      0o600,
    );
    writeFileSync(fd, bytes);
    fsyncSync(fd);
    closeSync(fd);
    fd = undefined;
    verifyPrivateFile(temporary);
    linkSync(temporary, target); // fails on existing file, including dangling links
    const directoryFd = openSync(dirname(target), constants.O_RDONLY | constants.O_DIRECTORY);
    try {
      fsyncSync(directoryFd);
    } finally {
      closeSync(directoryFd);
    }
    return target;
  } finally {
    if (fd !== undefined) closeSync(fd);
    rmSync(temporary, { force: true });
  }
}
export type RestorePreview = Readonly<{
  action: "PREVIEW_ONLY";
  bookIds: readonly string[];
  bundleHash: string;
  coverApply: "SEPARATE_DISABLED";
  writesAllowed: false;
}>;
/** Readback/confirmation is intentionally NOT wired to Official until safe owner auth + CAS is implemented. */
export function previewMetadataRestore(bundle: MetadataBundle): RestorePreview {
  const checked = verifyMetadataBundle(bundle);
  return Object.freeze({
    action: "PREVIEW_ONLY",
    bookIds: checked.snapshots.map((s) => s.bookId),
    bundleHash: checked.sha256,
    coverApply: "SEPARATE_DISABLED",
    writesAllowed: false,
  });
}
