import { createHash } from "node:crypto";
import { posix } from "node:path";
import { JSDOM } from "jsdom";
import yauzl, { type Entry, type ZipFile } from "yauzl";
import {
  cfiToXPointer,
  parseXPointer,
  resolveXPointer,
  xPointerToCfi,
} from "@prose-reader/koreader";
import { requireOfflineEdition, type OfflineEdition } from "./phase06.js";

const MAX_ARCHIVE_BYTES = 64 * 1024 * 1024;
const MAX_EXPANDED_BYTES = 128 * 1024 * 1024;
const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024;
const MAX_ENTRIES = 4096;
const MAX_SPINE_ITEMS = 512;
const CONTAINER_NS = "urn:oasis:names:tc:opendocument:xmlns:container";
const OPF_NS = "http://www.idpf.org/2007/opf";
const XHTML_NS = "http://www.w3.org/1999/xhtml";

type Archive = { zip: ZipFile; entries: Map<string, Entry> };
type SpineItem = { id: string; href: string; document?: Document };

function safeArchivePath(value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= 2048 &&
    !value.startsWith("/") &&
    !value.includes("//") &&
    !/[\\\x00-\x1f\x7f]/.test(value) &&
    !value.split("/").some((part) => part === "." || part === "..")
  );
}

function resolveEpubPath(base: string, href: string): string {
  if (
    !href ||
    href.length > 2048 ||
    /[?#\\\x00-\x20\x7f]/.test(href) ||
    /^[a-z][a-z0-9+.-]*:/i.test(href) ||
    href.startsWith("/")
  )
    throw new Error("EPUB_UNSAFE_HREF");
  let decoded: string;
  try {
    decoded = decodeURIComponent(href);
  } catch {
    throw new Error("EPUB_UNSAFE_HREF");
  }
  if (
    decoded.includes("%") ||
    decoded.startsWith("/") ||
    /^[a-z][a-z0-9+.-]*:/i.test(decoded) ||
    /[?#\\\x00-\x1f\x7f]/.test(decoded)
  )
    throw new Error("EPUB_UNSAFE_HREF");
  const resolved = posix.normalize(posix.join(base, decoded));
  if (!safeArchivePath(resolved) || resolved === ".." || resolved.startsWith("../"))
    throw new Error("EPUB_UNSAFE_HREF");
  return resolved;
}

async function openArchive(bytes: Buffer): Promise<Archive> {
  const zip = await new Promise<ZipFile>((resolve, reject) => {
    yauzl.fromBuffer(
      bytes,
      { lazyEntries: true, autoClose: false, strictFileNames: true },
      (error, file) => {
        if (error || !file) reject(new Error("EPUB_INVALID_ARCHIVE"));
        else resolve(file);
      },
    );
  });
  try {
    const entries = await new Promise<Map<string, Entry>>((resolve, reject) => {
      const found = new Map<string, Entry>();
      let expanded = 0;
      let count = 0;
      zip.on("error", () => reject(new Error("EPUB_INVALID_ARCHIVE")));
      zip.on("entry", (entry: Entry) => {
        count++;
        expanded += entry.uncompressedSize;
        const unixType = (entry.externalFileAttributes >>> 16) & 0o170000;
        if (
          count > MAX_ENTRIES ||
          expanded > MAX_EXPANDED_BYTES ||
          !safeArchivePath(entry.fileName) ||
          unixType === 0o120000 ||
          (entry.generalPurposeBitFlag & 1) !== 0 ||
          found.has(entry.fileName)
        ) {
          reject(new Error("EPUB_UNSAFE_ARCHIVE"));
          return;
        }
        if (!entry.fileName.endsWith("/")) found.set(entry.fileName, entry);
        zip.readEntry();
      });
      zip.once("end", () => resolve(found));
      zip.readEntry();
    });
    return { zip, entries };
  } catch (error) {
    zip.close();
    throw error;
  }
}

async function readDocument(archive: Archive, path: string): Promise<string> {
  const entry = archive.entries.get(path);
  if (!entry || entry.uncompressedSize > MAX_DOCUMENT_BYTES)
    throw new Error("EPUB_DOCUMENT_UNAVAILABLE");
  const bytes = await new Promise<Buffer>((resolve, reject) => {
    archive.zip.openReadStream(entry, (error, stream) => {
      if (error || !stream) return reject(new Error("EPUB_DOCUMENT_UNAVAILABLE"));
      const chunks: Buffer[] = [];
      let length = 0;
      stream.on("data", (chunk: Buffer) => {
        length += chunk.length;
        if (length > MAX_DOCUMENT_BYTES) stream.destroy(new Error("EPUB_DOCUMENT_TOO_LARGE"));
        else chunks.push(chunk);
      });
      stream.once("error", () => reject(new Error("EPUB_DOCUMENT_UNAVAILABLE")));
      stream.once("end", () => resolve(Buffer.concat(chunks)));
    });
  });
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error("EPUB_DOCUMENT_INVALID_UTF8");
  }
}

function parseXml(xml: string, contentType: "application/xml" | "application/xhtml+xml"): Document {
  // The parser never loads resources; rejecting DTDs also prevents entity expansion.
  if (/<!\s*(?:doctype|entity)\b/i.test(xml)) throw new Error("EPUB_UNSAFE_XML");
  try {
    return new JSDOM(xml, { contentType }).window.document;
  } catch {
    throw new Error("EPUB_INVALID_XML");
  }
}

function children(parent: Element, namespace: string, name: string): Element[] {
  return Array.from(parent.children).filter(
    (element) => element.namespaceURI === namespace && element.localName === name,
  );
}

// Prose's CFI package reads browser Node constants, while Node.js has no DOM
// global. The calls below are synchronous, so provide only those constants for
// their duration and restore the original global even when conversion fails.
function withNodeConstants<T>(convert: () => T): T {
  if (typeof globalThis.Node !== "undefined") return convert();
  const previous = Object.getOwnPropertyDescriptor(globalThis, "Node");
  Object.defineProperty(globalThis, "Node", {
    configurable: true,
    value: { ELEMENT_NODE: 1, TEXT_NODE: 3, CDATA_SECTION_NODE: 4 },
  });
  try {
    return convert();
  } finally {
    if (previous) Object.defineProperty(globalThis, "Node", previous);
    else Reflect.deleteProperty(globalThis, "Node");
  }
}

export type EpubDomConversion = Readonly<{
  status: "DOM_ANCHOR_MATCH" | "CHAPTER_ONLY" | "UNRESOLVED";
  source: "XPOINTER" | "CFI";
  nativePosition: string;
  targetPosition: string | null;
  spineIndex: number | null;
  spineId: string | null;
  spineHref: string | null;
  textAnchorSha256: string | null;
  reason:
    | "POSITION_UNRESOLVED"
    | "SPINE_UNSUPPORTED"
    | "ROUNDTRIP_UNRESOLVED"
    | "ROUNDTRIP_CHANGED"
    | "ANCHOR_NOT_PROVIDED"
    | "ANCHOR_MISMATCH"
    | null;
  percentage: null;
  evidence: "EPUB_DOM_ROUNDTRIP_ONLY";
}>;

/**
 * Read a bounded EPUB snapshot and bind its spine to the caller's byte identity.
 * No route, reader, filesystem path or Official backend is connected here.
 */
export async function openOfflineEpubPositions(input: Uint8Array, edition: OfflineEdition) {
  const boundEdition = Object.freeze({ ...edition });
  requireOfflineEdition(boundEdition);
  if (
    boundEdition.format !== "EPUB" ||
    !(input instanceof Uint8Array) ||
    !input.length ||
    input.length > MAX_ARCHIVE_BYTES
  )
    throw new Error("EPUB_INPUT_INVALID");
  const bytes = Buffer.from(input);
  if (createHash("sha256").update(bytes).digest("hex") !== boundEdition.editionSha256)
    throw new Error("PHASE06_EDITION_MISMATCH");
  const archive = await openArchive(bytes);
  try {
    if ((await readDocument(archive, "mimetype")) !== "application/epub+zip")
      throw new Error("EPUB_MIMETYPE_INVALID");
    const container = parseXml(
      await readDocument(archive, "META-INF/container.xml"),
      "application/xml",
    );
    const containerRoot = container.documentElement;
    if (containerRoot.localName !== "container" || containerRoot.namespaceURI !== CONTAINER_NS)
      throw new Error("EPUB_ROOTFILE_INVALID");
    const rootfileGroups = children(containerRoot, CONTAINER_NS, "rootfiles");
    const rootfiles =
      rootfileGroups.length === 1 ? children(rootfileGroups[0]!, CONTAINER_NS, "rootfile") : [];
    if (
      rootfiles.length !== 1 ||
      rootfiles[0]!.getAttribute("media-type") !== "application/oebps-package+xml"
    )
      throw new Error("EPUB_ROOTFILE_INVALID");
    const rootPath = resolveEpubPath("", rootfiles[0]!.getAttribute("full-path") ?? "");
    const opf = parseXml(await readDocument(archive, rootPath), "application/xml");
    const packageRoot = opf.documentElement;
    if (packageRoot.localName !== "package" || packageRoot.namespaceURI !== OPF_NS)
      throw new Error("EPUB_PACKAGE_INVALID");
    const manifests = children(packageRoot, OPF_NS, "manifest");
    const spines = children(packageRoot, OPF_NS, "spine");
    if (manifests.length !== 1 || spines.length !== 1) throw new Error("EPUB_PACKAGE_INVALID");
    const manifest = new Map<string, { href: string; mediaType: string }>();
    for (const item of children(manifests[0]!, OPF_NS, "item")) {
      const id = item.getAttribute("id") ?? "";
      const href = item.getAttribute("href") ?? "";
      const mediaType = item.getAttribute("media-type") ?? "";
      if (!id || manifest.has(id)) throw new Error("EPUB_MANIFEST_INVALID");
      manifest.set(id, { href: resolveEpubPath(posix.dirname(rootPath), href), mediaType });
    }
    const refs = children(spines[0]!, OPF_NS, "itemref");
    if (!refs.length || refs.length > MAX_SPINE_ITEMS) throw new Error("EPUB_SPINE_INVALID");
    const seen = new Set<string>();
    const spine: SpineItem[] = [];
    for (const ref of refs) {
      const id = ref.getAttribute("idref") ?? "";
      const item = manifest.get(id);
      if (!item || seen.has(id)) throw new Error("EPUB_SPINE_INVALID");
      seen.add(id);
      // Preserve unsupported spine slots so later DocFragment indexes do not shift.
      const slot: SpineItem = { id, href: item.href };
      if (item.mediaType === "application/xhtml+xml") {
        const document = parseXml(await readDocument(archive, item.href), "application/xhtml+xml");
        if (
          document.documentElement.localName !== "html" ||
          document.documentElement.namespaceURI !== XHTML_NS ||
          children(document.documentElement, XHTML_NS, "body").length !== 1
        )
          throw new Error("EPUB_XHTML_INVALID");
        slot.document = document;
      }
      spine.push(slot);
    }
    const lookup = (index: number) => {
      const item = spine[index];
      return item?.document ? { document: item.document, id: item.id } : undefined;
    };
    return Object.freeze({
      edition: boundEdition,
      spineCount: spine.length,
      convert(
        input: Readonly<{
          source: "XPOINTER" | "CFI";
          nativePosition: string;
          expectedText?: string;
        }>,
      ): EpubDomConversion {
        return withNodeConstants(() => {
          if (
            !input ||
            (input.source !== "XPOINTER" && input.source !== "CFI") ||
            typeof input.nativePosition !== "string" ||
            !input.nativePosition ||
            input.nativePosition.length > 4096 ||
            /[\x00-\x1f\x7f]/.test(input.nativePosition) ||
            (input.expectedText !== undefined &&
              (typeof input.expectedText !== "string" ||
                !input.expectedText ||
                input.expectedText.length > 1024))
          )
            throw new Error("PHASE06_POSITION_INVALID");
          const empty = {
            source: input.source,
            nativePosition: input.nativePosition,
            targetPosition: null,
            spineIndex: null,
            spineId: null,
            spineHref: null,
            textAnchorSha256: null,
            reason: "POSITION_UNRESOLVED",
            percentage: null,
            evidence: "EPUB_DOM_ROUNDTRIP_ONLY",
          } as const;
          const xpointer =
            input.source === "XPOINTER"
              ? input.nativePosition
              : cfiToXPointer(input.nativePosition, lookup);
          const parsed = xpointer ? parseXPointer(xpointer) : undefined;
          const item = parsed ? spine[parsed.spineItemIndex] : undefined;
          if (!parsed || !item) return { ...empty, status: "UNRESOLVED" };
          const chapter = {
            ...empty,
            spineIndex: parsed.spineItemIndex,
            spineId: item.id,
            spineHref: item.href,
          };
          if (!item.document || parsed.containsBoxingElements)
            return { ...chapter, status: "CHAPTER_ONLY", reason: "SPINE_UNSUPPORTED" };
          const position = resolveXPointer(parsed, item.document);
          const cfi = xPointerToCfi(parsed, lookup);
          const roundtripPointer = cfi ? cfiToXPointer(cfi, lookup) : undefined;
          const roundtrip = roundtripPointer
            ? resolveXPointer(roundtripPointer, item.document)
            : undefined;
          if (!position || !cfi || !roundtrip)
            return { ...chapter, status: "CHAPTER_ONLY", reason: "ROUNDTRIP_UNRESOLVED" };
          if (
            position.node !== roundtrip.node ||
            (position.offset ?? 0) !== (roundtrip.offset ?? 0)
          )
            return { ...chapter, status: "CHAPTER_ONLY", reason: "ROUNDTRIP_CHANGED" };
          const offset = position.offset ?? 0;
          const text = [3, 4].includes(position.node.nodeType) ? position.node.textContent : null;
          if (!input.expectedText)
            return { ...chapter, status: "CHAPTER_ONLY", reason: "ANCHOR_NOT_PROVIDED" };
          if (
            text === null ||
            text.slice(offset, offset + input.expectedText.length) !== input.expectedText
          )
            return { ...chapter, status: "CHAPTER_ONLY", reason: "ANCHOR_MISMATCH" };
          return {
            ...chapter,
            status: "DOM_ANCHOR_MATCH",
            reason: null,
            targetPosition: input.source === "XPOINTER" ? cfi : xpointer!,
            textAnchorSha256: createHash("sha256").update(input.expectedText, "utf8").digest("hex"),
          };
        });
      },
    });
  } finally {
    archive.zip.close();
  }
}
