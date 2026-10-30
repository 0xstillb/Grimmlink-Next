import { mkdtemp, mkdir, rm, writeFile, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { adjacentOpfPath, buildSparseMetadataPreview, inspectOfflineBookFixture, parseOpfPreview, planCoverPath, planIngestion } from "./index.js";

const xml = `<?xml version="1.0" encoding="utf-8"?>
<package xmlns:dc="http://purl.org/dc/elements/1.1/">
 <metadata>
  <dc:title>A &amp; B</dc:title><dc:publisher>Example</dc:publisher>
  <dc:date>2024-02-29</dc:date><dc:language>th</dc:language>
  <dc:identifier>9780306406157</dc:identifier>
  <meta name="calibre:series" content="Saga"/>
  <meta name="calibre:series_index" content="2"/>
  <meta name="cover" content="c1"/>
 </metadata>
 <manifest><item id="c1" href="images/cover.jpg" media-type="image/jpeg"/></manifest>
</package>`;
function parse(s: string) { return parseOpfPreview(Buffer.from(s)); }
it("plans no writes and parses sparse OPF scalars and explicit manifest cover", () => {
  expect(planIngestion().writesAllowed).toBe(false);
  const p = parse(xml);
  expect(p.metadata).toMatchObject({ title: "A & B", publisher: "Example", publishedDate: "2024-02-29", language: "th", isbn13: "9780306406157", seriesName: "Saga", seriesNumber: 2 });
  expect(p.coverHref).toBe("images/cover.jpg");
  expect(buildSparseMetadataPreview(p, { publisher: true }).fields).not.toHaveProperty("publisher");
  expect(buildSparseMetadataPreview(p, { allMetadataLocked: true }).fields).toEqual({});
  expect(buildSparseMetadataPreview(p).writesAllowed).toBe(false);
});
it("rejects active XML, malformed markup, duplicate conflicting scalars, and bad encodings", () => {
  for (const s of [
    '<!DOCTYPE package [<!ENTITY e SYSTEM "file:///etc/passwd">]><package><metadata><dc:title>&e;</dc:title></metadata></package>',
    "<package><metadata><dc:title>Oops</metadata></package>",
    "<package><metadata><dc:title>A</dc:title><dc:title>B</dc:title></metadata></package>",
    "<package><metadata><dc:title>&external;</dc:title></metadata></package>",
    '<?xml version="1.0" encoding="utf-16"?><package><metadata/></package>',
    "<package><metadata><dc:title><b>X</b></dc:title></metadata></package>",
  ]) expect(() => parse(s)).toThrow();
});
it("omits invalid dates and ISBN while preserving leading zeros", () => {
  const p = parse("<package><metadata><dc:date>2023-02-29</dc:date><dc:identifier>0306406152</dc:identifier><dc:identifier>9780306406158</dc:identifier></metadata></package>");
  expect(p.metadata).toEqual({ isbn10: "0306406152" });
});
it("validates adjacent path and refuses traversal or remote cover URLs", () => {
  expect(adjacentOpfPath("books/a.epub")).toBe("books/a.opf");
  expect(planCoverPath("books/a.opf", "images/c.jpg")).toBe("books/images/c.jpg");
  for (const href of ["../private.jpg", "https://example.org/a.jpg", "%2e%2e/a.jpg", "/abs.jpg", "a\\b.jpg", "a//b.jpg"]) {
    expect(() => planCoverPath("books/a.opf", href)).toThrow();
  }
});
const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((r) => rm(r, { recursive: true, force: true }))); });
it("dry-runs an actual offline folder without a write or Official connection", async () => {
  const root = await mkdtemp(join(tmpdir(), "phase03-opf-"));
  roots.push(root);
  await mkdir(join(root, "books", "images"), { recursive: true });
  await writeFile(join(root, "books", "a.epub"), "EPUB FIXTURE");
  await writeFile(join(root, "books", "a.opf"), xml);
  await writeFile(join(root, "books", "images", "cover.jpg"), "COVER FIXTURE");
  const result = await inspectOfflineBookFixture(root, "books/a.epub");
  expect(result.action).toBe("DRY_RUN_ONLY");
  expect(result.writesAllowed).toBe(false);
  expect(result.cover?.sha256).toMatch(/^[a-f0-9]{64}$/);
  expect(result.metadata.title).toBe("A & B");
  await rm(join(root, "books", "images", "cover.jpg"));
  await symlink("/etc/passwd", join(root, "books", "images", "cover.jpg"));
  await expect(inspectOfflineBookFixture(root, "books/a.epub")).rejects.toThrow();
});
