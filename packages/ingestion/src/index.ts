import { lstat, readdir, realpath } from "node:fs/promises";
import { posix, resolve } from "node:path";
import { planReadOnlyLocation, readNasFixtureFile } from "@grimmlink/locations";

export interface IngestionPlan {
  readonly action: "DRY_RUN_ONLY";
  readonly source: "NAS_OPF";
  readonly writesAllowed: false;
}
export function planIngestion(): IngestionPlan {
  return Object.freeze({ action: "DRY_RUN_ONLY", source: "NAS_OPF", writesAllowed: false });
}

const scalarKeys = [
  "title",
  "subtitle",
  "publisher",
  "publishedDate",
  "description",
  "seriesName",
  "seriesNumber",
  "isbn13",
  "isbn10",
  "language",
] as const;
export type ScalarKey = (typeof scalarKeys)[number];
export type SparseMetadata = Partial<Record<ScalarKey, string | number>>;
export interface OpfPreview {
  readonly metadata: Readonly<SparseMetadata>;
  readonly coverHref: string | null;
}
import { parseOpfXmlPreview as parseOpfPreview } from "./opf-xml.js";
export { parseOpfPreview };

/** No URL-encoded separators, external URLs, or traversal from OPF href. */
export function planCoverPath(opfPath: string, href: string): string {
  planReadOnlyLocation(opfPath);
  if (
    typeof href !== "string" ||
    !href ||
    /[%?#:\\\x00-\x1f]/.test(href) ||
    href.startsWith("/") ||
    href.split("/").some((x) => !x || x === "." || x === "..")
  )
    throw new Error("Unsafe OPF cover href");
  const mapped = posix.join(posix.dirname(opfPath), href);
  return planReadOnlyLocation(mapped).relativePath;
}

export function adjacentOpfPath(epubPath: string): string {
  const planned = planReadOnlyLocation(epubPath).relativePath;
  if (!/\.epub$/i.test(planned)) throw new Error("Expected EPUB path");
  return planned.replace(/\.epub$/i, ".opf");
}

/** Both supported adjacent OPF names must be considered before selecting one. */
export function adjacentOpfCandidates(epubPath: string): readonly string[] {
  const basename = adjacentOpfPath(epubPath);
  const generic = posix.join(posix.dirname(basename), "metadata.opf");
  return Object.freeze([...new Set([basename, generic])]);
}

export function buildSparseMetadataPreview(
  source: OpfPreview,
  mockLocks: Partial<Record<ScalarKey | "allMetadataLocked", boolean>> = {},
): Readonly<{ fields: Readonly<SparseMetadata>; writesAllowed: false; action: "DRY_RUN_ONLY" }> {
  const fields: SparseMetadata = {};
  if (!mockLocks.allMetadataLocked) {
    for (const key of scalarKeys) {
      if (!mockLocks[key] && source.metadata[key] !== undefined) {
        Object.assign(fields, { [key]: source.metadata[key] });
      }
    }
  }
  return Object.freeze({
    fields: Object.freeze(fields),
    writesAllowed: false,
    action: "DRY_RUN_ONLY",
  });
}

export async function inspectOfflineBookFixture(
  fixtureRoot: string,
  epubPath: string,
): Promise<
  Readonly<{
    action: "DRY_RUN_ONLY";
    writesAllowed: false;
    epub: { path: string; sha256: string; size: number };
    opf: { path: string; sha256: string; size: number };
    cover: { path: string; sha256: string; size: number } | null;
    metadata: Readonly<SparseMetadata>;
  }>
> {
  const epub = await readNasFixtureFile(fixtureRoot, epubPath, 16 * 1024 * 1024);
  const candidates = await Promise.all(
    adjacentOpfCandidates(epubPath).map(async (path) => {
      try {
        return await readNasFixtureFile(fixtureRoot, path, 1024 * 1024);
      } catch (error) {
        if (error instanceof Error && "code" in error && error.code === "ENOENT") return null;
        throw error;
      }
    }),
  );
  const found = candidates.filter((candidate) => candidate !== null);
  if (found.length !== 1)
    throw new Error(found.length ? "Ambiguous adjacent OPF" : "Adjacent OPF missing");
  const opf = found[0]!;
  const opfPath = opf.relativePath;
  if (posix.basename(opfPath) === "metadata.opf") {
    // Shared metadata.opf is usable for a fixture only when its directory
    // contains exactly the requested EPUB. This does not prove NAS race safety.
    const directory = resolve(fixtureRoot, posix.dirname(epub.relativePath));
    const before = await lstat(directory);
    if (
      !before.isDirectory() ||
      before.isSymbolicLink() ||
      (await realpath(directory)) !== directory
    )
      throw new Error("Untrusted fixture directory");
    const books = (await readdir(directory, { withFileTypes: true })).filter((entry) =>
      /\.epub$/i.test(entry.name),
    );
    const after = await lstat(directory);
    if (
      before.dev !== after.dev ||
      before.ino !== after.ino ||
      before.mtimeMs !== after.mtimeMs ||
      before.ctimeMs !== after.ctimeMs ||
      books.length !== 1 ||
      books[0]!.name !== posix.basename(epub.relativePath) ||
      !books[0]!.isFile() ||
      books[0]!.isSymbolicLink()
    )
      throw new Error("Ambiguous metadata.opf fixture directory");
  }
  const parsed = parseOpfPreview(opf.bytes);
  const coverPath = parsed.coverHref ? planCoverPath(opfPath, parsed.coverHref) : null;
  const cover = coverPath ? await readNasFixtureFile(fixtureRoot, coverPath) : null;
  if (cover && coverPath) {
    const b = cover.bytes;
    const ext = posix.extname(coverPath).toLowerCase();
    const jpeg = b.length >= 4 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
    const png =
      b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const webp =
      b.length >= 12 &&
      b.toString("ascii", 0, 4) === "RIFF" &&
      b.toString("ascii", 8, 12) === "WEBP";
    if (!((/\.jpe?g$/.test(ext) && jpeg) || (ext === ".png" && png) || (ext === ".webp" && webp)))
      throw new Error("Cover signature does not match extension");
  }
  return Object.freeze({
    action: "DRY_RUN_ONLY" as const,
    writesAllowed: false as const,
    epub: { path: epub.relativePath, sha256: epub.sha256, size: epub.size },
    opf: { path: opf.relativePath, sha256: opf.sha256, size: opf.size },
    cover: cover ? { path: cover.relativePath, sha256: cover.sha256, size: cover.size } : null,
    metadata: buildSparseMetadataPreview(parsed).fields,
  });
}
export * from "./sidecar.js";
export * from "./metadata-plan.js";
