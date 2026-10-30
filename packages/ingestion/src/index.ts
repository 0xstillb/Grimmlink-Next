import { posix } from "node:path";
import { planReadOnlyLocation, readNasFixtureFile } from "../../locations/src/index.js";

export interface IngestionPlan {
  readonly action: "DRY_RUN_ONLY";
  readonly source: "NAS_OPF";
  readonly writesAllowed: false;
}
export function planIngestion(): IngestionPlan {
  return Object.freeze({ action: "DRY_RUN_ONLY", source: "NAS_OPF", writesAllowed: false });
}

const scalarKeys = [
  "title", "subtitle", "publisher", "publishedDate", "description",
  "seriesName", "seriesNumber", "isbn13", "isbn10", "language",
] as const;
export type ScalarKey = (typeof scalarKeys)[number];
export type SparseMetadata = Partial<Record<ScalarKey, string | number>>;
export interface OpfPreview {
  readonly metadata: Readonly<SparseMetadata>;
  readonly coverHref: string | null;
}
type Element = { name: string; attrs: Record<string, string>; text: string };
const namePattern = /^[A-Za-z_][\w.:-]*$/;

function decodeEntities(value: string): string {
  return value.replace(/&([^;\s]{1,30});|&/g, (match, name: string | undefined) => {
    if (!name) throw new Error("Unescaped XML entity");
    const builtins: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
    if (Object.hasOwn(builtins, name)) return builtins[name]!;
    const numeric = /^#(x[\da-fA-F]+|\d+)$/.exec(name);
    if (!numeric) throw new Error("Unsupported XML entity");
    const codepoint = numeric[1]!.startsWith("x")
      ? Number.parseInt(numeric[1]!.slice(1), 16)
      : Number.parseInt(numeric[1]!, 10);
    if (!Number.isSafeInteger(codepoint) || codepoint < 32 ||
        (codepoint >= 0xd800 && codepoint <= 0xdfff) ||
        codepoint > 0x10ffff) throw new Error("Invalid XML character reference");
    return String.fromCodePoint(codepoint);
  });
}

function attributes(raw: string): Record<string, string> {
  const result: Record<string, string> = Object.create(null);
  const rx = /([A-Za-z_][\w.:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/gy;
  let p = 0;
  while (p < raw.length) {
    while (/\s/.test(raw[p] ?? "")) p++;
    if (p === raw.length) break;
    rx.lastIndex = p;
    const m = rx.exec(raw);
    if (!m) throw new Error("Malformed OPF attribute");
    if (Object.hasOwn(result, m[1]!)) throw new Error("Duplicate OPF attribute");
    result[m[1]!] = decodeEntities(m[2] ?? m[3] ?? "");
    p = rx.lastIndex;
  }
  return result;
}
function isbnValid(code: string): boolean {
  if (/^\d{13}$/.test(code)) {
    const sum = [...code].slice(0, 12).reduce((n, c, i) => n + Number(c) * (i % 2 ? 3 : 1), 0);
    return (10 - (sum % 10)) % 10 === Number(code[12]);
  }
  if (/^\d{9}[\dX]$/.test(code)) {
    const sum = [...code].reduce((n, c, i) => n + (c === "X" ? 10 : Number(c)) * (10 - i), 0);
    return sum % 11 === 0;
  }
  return false;
}
function record(target: SparseMetadata, key: ScalarKey, raw: string): void {
  const value = raw.trim();
  if (!value) return;
  let parsed: string | number = value;
  if (value.length > (key === "description" ? 8192 : 512)) return;
  if (key === "publishedDate") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) ||
        Number.isNaN(Date.parse(value)) ||
        new Date(value + "T00:00:00Z").toISOString().slice(0, 10) !== value) return;
  }
  if (key === "language" && !/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(value)) return;
  if ((key === "isbn10" || key === "isbn13") && !isbnValid(value)) return;
  if (key === "seriesNumber") {
    const num = Number(value);
    if (!/^(?:0|[1-9]\d*)(?:\.\d{1,3})?$/.test(value) || !Number.isFinite(num) ||
        num <= 0 || num > 100000) return;
    parsed = num;
  }
  if (target[key] !== undefined && target[key] !== parsed) throw new Error("Ambiguous OPF scalar");
  Object.assign(target, { [key]: parsed });
}

/**
 * Strict UTF-8 OPF subset parser for OFFLINE preview only.
 * Never enables DTD, entities, scripts, external resources, or Official writes.
 * Unsupported constructs fail closed rather than approximating a library XML parser.
 */
export function parseOpfPreview(bytes: Uint8Array): OpfPreview {
  if (bytes.byteLength > 1024 * 1024) throw new Error("OPF too large");
  let xml = new TextDecoder("utf-8", { fatal: true }).decode(bytes).replace(/^\uFEFF/, "");
  if (/<!DOCTYPE|<!ENTITY|<!\[CDATA\[/i.test(xml)) throw new Error("Prohibited XML construct");
  if (xml.startsWith("<?xml")) {
    const end = xml.indexOf("?>");
    if (end < 0) throw new Error("Malformed XML declaration");
    const decl = xml.slice(0, end + 2);
    if (/encoding\s*=\s*["'](?!utf-8["'])/i.test(decl)) throw new Error("Non-UTF8 OPF");
    xml = xml.slice(end + 2);
  }
  if (xml.includes("<?")) throw new Error("Prohibited XML processing instruction");
  const stack: Element[] = [];
  const metadata: SparseMetadata = {};
  const manifest: { id: string; href: string; cover: boolean; media: string }[] = [];
  const coverReferences: string[] = [];
  let p = 0;
  let rootSeen = false;
  let metadataSeen = false;
  while (p < xml.length) {
    if (xml.startsWith("<!--", p)) {
      const end = xml.indexOf("-->", p + 4);
      if (end < 0) throw new Error("Unclosed XML comment");
      p = end + 3;
      continue;
    }
    if (xml[p] !== "<") {
      const next = xml.indexOf("<", p);
      const raw = xml.slice(p, next < 0 ? xml.length : next);
      if (!stack.length && raw.trim()) throw new Error("Text outside package");
      if (stack.length) stack[stack.length - 1]!.text += decodeEntities(raw);
      p = next < 0 ? xml.length : next;
      continue;
    }
    let quote = "";
    let end = -1;
    for (let j = p + 1; j < xml.length; j++) {
      const ch = xml[j]!;
      if (quote) { if (ch === quote) quote = ""; }
      else if (ch === '"' || ch === "'") quote = ch;
      else if (ch === ">") { end = j; break; }
    }
    if (end < 0) throw new Error("Unclosed XML tag");
    const token = xml.slice(p + 1, end).trim();
    p = end + 1;
    if (token.startsWith("!") || token.startsWith("?")) throw new Error("Prohibited XML instruction");
    if (token.startsWith("/")) {
      close(token.slice(1).trim());
      continue;
    }
    const self = token.endsWith("/");
    const inner = self ? token.slice(0, -1).trimEnd() : token;
    const match = /^([^\s]+)([\s\S]*)$/.exec(inner);
    if (!match || !namePattern.test(match[1]!)) throw new Error("Malformed XML element");
    const name = match[1]!;
    if (!stack.length) {
      if (rootSeen || name !== "package") throw new Error("OPF package root required");
      rootSeen = true;
    }
    if (name === "metadata" && stack.length === 1 && stack[0]!.name === "package") metadataSeen = true;
    const element: Element = { name, attrs: attributes(match[2]!), text: "" };
    stack.push(element);
    if (stack.length > 32) throw new Error("OPF depth exceeded");
    if (self) close(name);
  }
  if (!rootSeen || !metadataSeen || stack.length) throw new Error("Incomplete OPF");
  const selected = manifest.filter((item) =>
    item.cover || coverReferences.includes(item.id),
  );
  if (selected.length > 1) throw new Error("Ambiguous OPF cover");
  const cover = selected[0];
  if (cover && !["image/jpeg", "image/png", "image/webp"].includes(cover.media))
    throw new Error("Unsupported OPF cover type");
  if (cover && !/\.(?:jpe?g|png|webp)$/i.test(cover.href))
    throw new Error("Unsupported OPF cover extension");
  return Object.freeze({
    metadata: Object.freeze(metadata),
    coverHref: cover ? cover.href : null,
  });

  function close(name: string): void {
    const element = stack.pop();
    if (!element || element.name !== name) throw new Error("Unbalanced OPF XML");
    const parent = stack[stack.length - 1];
    if (!parent) return;
    if (parent.name === "metadata" && stack.length === 2) {
      const key: Record<string, ScalarKey> = {
        "dc:title": "title", "dc:publisher": "publisher", "dc:date": "publishedDate",
        "dc:description": "description", "dc:language": "language",
      };
      if (Object.hasOwn(key, name)) record(metadata, key[name]!, element.text);
      if (name === "dc:identifier" && isbnValid(element.text.trim())) {
        const code = element.text.trim();
        record(metadata, code.length === 10 ? "isbn10" : "isbn13", code);
      }
      if (name === "meta") {
        const metaName = element.attrs.name;
        const content = element.attrs.content ?? "";
        if (metaName === "calibre:series") record(metadata, "seriesName", content);
        if (metaName === "calibre:series_index") record(metadata, "seriesNumber", content);
        if (metaName === "calibre:subtitle") record(metadata, "subtitle", content);
        if (metaName === "cover" && content) coverReferences.push(content);
      }
    }
    if (parent.name === "manifest" && stack.length === 2 && name === "item") {
      if (element.attrs.id && element.attrs.href) {
        manifest.push({
          id: element.attrs.id,
          href: element.attrs.href,
          media: element.attrs["media-type"] ?? "",
          cover: (element.attrs.properties ?? "").split(/\s+/).includes("cover-image"),
        });
      }
    }
    // Scalar elements must not contain mixed child content or nested markup.
    if (/^dc:(?:title|publisher|date|description|language|identifier)$/.test(parent.name))
      throw new Error("Nested scalar OPF content");
  }
}

/** No URL-encoded separators, external URLs, or traversal from OPF href. */
export function planCoverPath(opfPath: string, href: string): string {
  planReadOnlyLocation(opfPath);
  if (typeof href !== "string" || !href || /[%?#:\\\x00-\x1f]/.test(href) ||
      href.startsWith("/") || href.split("/").some((x) => !x || x === "." || x === ".."))
    throw new Error("Unsafe OPF cover href");
  const mapped = posix.join(posix.dirname(opfPath), href);
  return planReadOnlyLocation(mapped).relativePath;
}

export function adjacentOpfPath(epubPath: string): string {
  const planned = planReadOnlyLocation(epubPath).relativePath;
  if (!/\.epub$/i.test(planned)) throw new Error("Expected EPUB path");
  return planned.replace(/\.epub$/i, ".opf");
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
  return Object.freeze({ fields: Object.freeze(fields), writesAllowed: false, action: "DRY_RUN_ONLY" });
}

export async function inspectOfflineBookFixture(
  fixtureRoot: string,
  epubPath: string,
): Promise<Readonly<{
  action: "DRY_RUN_ONLY";
  writesAllowed: false;
  epub: { path: string; sha256: string; size: number };
  opf: { path: string; sha256: string; size: number };
  cover: { path: string; sha256: string; size: number } | null;
  metadata: Readonly<SparseMetadata>;
}>> {
  const opfPath = adjacentOpfPath(epubPath);
  const epub = await readNasFixtureFile(fixtureRoot, epubPath, 16 * 1024 * 1024);
  const opf = await readNasFixtureFile(fixtureRoot, opfPath, 1024 * 1024);
  const parsed = parseOpfPreview(opf.bytes);
  const coverPath = parsed.coverHref ? planCoverPath(opfPath, parsed.coverHref) : null;
  const cover = coverPath ? await readNasFixtureFile(fixtureRoot, coverPath) : null;
  return Object.freeze({
    action: "DRY_RUN_ONLY" as const,
    writesAllowed: false as const,
    epub: { path: epub.relativePath, sha256: epub.sha256, size: epub.size },
    opf: { path: opf.relativePath, sha256: opf.sha256, size: opf.size },
    cover: cover ? { path: cover.relativePath, sha256: cover.sha256, size: cover.size } : null,
    metadata: buildSparseMetadataPreview(parsed).fields,
  });
}
