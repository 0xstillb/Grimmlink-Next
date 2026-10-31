import { SaxesParser, type SaxesTagNS } from "saxes";
import type { OpfPreview, ScalarKey, SparseMetadata } from "./index.js";

const OPF_NS = "http://www.idpf.org/2007/opf";
const DC_NS = "http://purl.org/dc/elements/1.1/";
type Frame = { local: string; uri: string; attributes: Record<string, string>; text: string };
type Meta = { attributes: Record<string, string>; text: string };
type Title = { id: string | null; text: string };

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
  if (!value || value.length > (key === "description" ? 8192 : 512)) return;
  let parsed: string | number = value;
  if (key === "publishedDate") {
    const date = new Date(value + "T00:00:00Z");
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      Number.isNaN(date.valueOf()) ||
      date.toISOString().slice(0, 10) !== value
    )
      return;
  }
  if (key === "language" && !/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(value)) return;
  if ((key === "isbn10" || key === "isbn13") && !isbnValid(value)) return;
  if (key === "seriesNumber") {
    const number = Number(value);
    if (
      !/^(?:0|[1-9]\d*)(?:\.\d{1,3})?$/.test(value) ||
      !Number.isFinite(number) ||
      number <= 0 ||
      number > 100000
    )
      return;
    parsed = number;
  }
  if (target[key] !== undefined && target[key] !== parsed) throw new Error("Ambiguous OPF scalar");
  Object.assign(target, { [key]: parsed });
}

function attributes(tag: SaxesTagNS): Record<string, string> {
  const result: Record<string, string> = Object.create(null);
  for (const attribute of Object.values(tag.attributes)) {
    if (!attribute.uri && !attribute.prefix) result[attribute.local] = attribute.value;
  }
  return result;
}

/** Namespace-aware, bounded OPF preview with no DTD, external entities or I/O. */
export function parseOpfXmlPreview(bytes: Uint8Array): OpfPreview {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength > 1024 * 1024)
    throw new Error("OPF too large or invalid");
  let xml: string;
  try {
    xml = new TextDecoder("utf-8", { fatal: true }).decode(bytes).replace(/^\uFEFF/, "");
  } catch {
    throw new Error("Invalid UTF-8 OPF");
  }
  const metadata: SparseMetadata = {};
  const stack: Frame[] = [];
  const metas: Meta[] = [];
  const titles: Title[] = [];
  const manifest: { id: string; href: string; cover: boolean; media: string }[] = [];
  const itemIds = new Set<string>();
  const xmlIds = new Set<string>();
  let rootSeen = false;
  let packageNamespace = "";
  let metadataCount = 0;
  const parser = new SaxesParser({ xmlns: true });
  parser.on("xmldecl", (declaration) => {
    if (declaration.encoding && declaration.encoding.toLowerCase() !== "utf-8")
      throw new Error("Non-UTF8 OPF");
  });
  parser.on("doctype", () => {
    throw new Error("Prohibited XML construct");
  });
  parser.on("processinginstruction", () => {
    throw new Error("Prohibited XML processing instruction");
  });
  parser.on("error", () => {
    throw new Error("Malformed OPF XML");
  });
  parser.on("opentag", (tag) => {
    const parent = stack.at(-1);
    if (!parent) {
      if (rootSeen || tag.local !== "package" || (tag.uri !== OPF_NS && tag.uri !== ""))
        throw new Error("OPF package root required");
      rootSeen = true;
      packageNamespace = tag.uri;
    } else if (
      parent.uri === DC_NS &&
      ["title", "publisher", "date", "description", "language", "identifier"].includes(parent.local)
    ) {
      throw new Error("Nested scalar OPF content");
    }
    if (stack.length === 1 && tag.local === "metadata" && tag.uri === packageNamespace)
      metadataCount++;
    const attrs = attributes(tag);
    if (attrs.id) {
      if (xmlIds.has(attrs.id)) throw new Error("Duplicate OPF id");
      xmlIds.add(attrs.id);
    }
    stack.push({ local: tag.local, uri: tag.uri, attributes: attrs, text: "" });
    if (stack.length > 32) throw new Error("OPF depth exceeded");
  });
  const appendText = (text: string) => {
    const current = stack.at(-1);
    if (current) current.text += text;
    else if (text.trim()) throw new Error("Text outside package");
  };
  parser.on("text", appendText);
  parser.on("cdata", appendText);
  parser.on("closetag", () => {
    const item = stack.pop();
    const parent = stack.at(-1);
    if (!item || !parent) return;
    if (parent.local === "metadata" && parent.uri === packageNamespace && stack.length === 2) {
      if (item.uri === DC_NS) {
        if (item.local === "title")
          titles.push({ id: item.attributes.id ?? null, text: item.text });
        const names: Record<string, ScalarKey> = {
          publisher: "publisher",
          date: "publishedDate",
          description: "description",
          language: "language",
        };
        if (Object.hasOwn(names, item.local)) record(metadata, names[item.local]!, item.text);
        if (item.local === "identifier" && isbnValid(item.text.trim())) {
          const code = item.text.trim();
          record(metadata, code.length === 10 ? "isbn10" : "isbn13", code);
        }
      } else if (item.uri === packageNamespace && item.local === "meta") {
        metas.push({ attributes: item.attributes, text: item.text.trim() });
      }
    }
    if (
      parent.local === "manifest" &&
      parent.uri === packageNamespace &&
      stack.length === 2 &&
      item.local === "item" &&
      item.uri === packageNamespace
    ) {
      const id = item.attributes.id;
      const href = item.attributes.href;
      if (!id || !href || itemIds.has(id))
        throw new Error("Invalid or duplicate OPF manifest item");
      itemIds.add(id);
      manifest.push({
        id,
        href,
        media: item.attributes["media-type"] ?? "",
        cover: (item.attributes.properties ?? "").split(/\s+/).includes("cover-image"),
      });
    }
  });
  parser.write(xml).close();
  if (!rootSeen || metadataCount !== 1 || stack.length) throw new Error("Incomplete OPF");

  const refinement = (id: string, property: string): string[] =>
    metas
      .filter(
        (meta) => meta.attributes.refines === `#${id}` && meta.attributes.property === property,
      )
      .map((meta) => meta.text);
  for (const title of titles) {
    const types = title.id ? refinement(title.id, "title-type") : [];
    if (types.length > 1) throw new Error("Ambiguous OPF title type");
    if (types[0] === "subtitle") record(metadata, "subtitle", title.text);
    else if (!types.length || types[0] === "main") record(metadata, "title", title.text);
  }
  const coverReferences: string[] = [];
  for (const meta of metas) {
    const name = meta.attributes.name;
    const content = meta.attributes.content ?? "";
    if (name === "calibre:series") record(metadata, "seriesName", content);
    if (name === "calibre:series_index") record(metadata, "seriesNumber", content);
    if (name === "calibre:subtitle") record(metadata, "subtitle", content);
    if (name === "cover" && content) coverReferences.push(content);
    if (meta.attributes.property === "belongs-to-collection" && meta.attributes.id) {
      const types = refinement(meta.attributes.id, "collection-type");
      if (types.length > 1) throw new Error("Ambiguous OPF collection type");
      if (types[0] === "series") {
        record(metadata, "seriesName", meta.text);
        const positions = refinement(meta.attributes.id, "group-position");
        if (positions.length > 1) throw new Error("Ambiguous OPF series position");
        if (positions[0]) record(metadata, "seriesNumber", positions[0]);
      }
    }
  }
  const selected = manifest.filter((item) => item.cover || coverReferences.includes(item.id));
  if (selected.length > 1) throw new Error("Ambiguous OPF cover");
  const cover = selected[0];
  if (cover && !["image/jpeg", "image/png", "image/webp"].includes(cover.media))
    throw new Error("Unsupported OPF cover type");
  if (cover && !/\.(?:jpe?g|png|webp)$/i.test(cover.href))
    throw new Error("Unsupported OPF cover extension");
  return Object.freeze({ metadata: Object.freeze(metadata), coverHref: cover?.href ?? null });
}
