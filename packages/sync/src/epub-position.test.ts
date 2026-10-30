import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { openOfflineEpubPositions } from "./epub-position.js";

const container = `<?xml version="1.0"?>
<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">
  <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`;
const opf = `<?xml version="1.0"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book">
  <manifest>
    <item id="first" href="Text/chapter%201.xhtml" media-type="application/xhtml+xml"/>
    <item id="second" href="Text/chapter2.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine><itemref idref="first"/><itemref idref="second" linear="no"/></spine>
</package>`;
const first = `<html xmlns="http://www.w3.org/1999/xhtml"><head><title>หนึ่ง</title></head><body><p>ภาษาไทย กำลังอ่าน 😀 ต่อไป</p></body></html>`;
const second = `<html xmlns="http://www.w3.org/1999/xhtml"><head><title>สอง</title></head><body><p>บทที่สอง ข้อความ</p></body></html>`;

function fixture(overrides: Record<string, string> = {}) {
  const files = {
    mimetype: "application/epub+zip",
    "META-INF/container.xml": container,
    "OEBPS/content.opf": opf,
    "OEBPS/Text/chapter 1.xhtml": first,
    "OEBPS/Text/chapter2.xhtml": second,
    ...overrides,
  };
  const entries = Object.fromEntries(
    Object.entries(files).map(([name, content]) => [name, strToU8(content)]),
  );
  const bytes = zipSync(entries);
  return {
    bytes,
    edition: {
      bookId: "book_1",
      bookFileId: "file_1",
      editionSha256: createHash("sha256").update(bytes).digest("hex"),
      format: "EPUB" as const,
    },
  };
}

describe("Phase06 EPUB DOM position conversion", () => {
  it("matches a KOReader crengine oracle position from the upstream MIT EPUB fixture", async () => {
    const bytes = await readFile(
      new URL("./fixtures/prose-koreader/synthetic.epub", import.meta.url),
    );
    const oracle = JSON.parse(
      await readFile(
        new URL("./fixtures/prose-koreader/synthetic.crengine.json", import.meta.url),
        "utf8",
      ),
    ) as {
      fragments: { index: number; words: [string, string, string][] }[];
    };
    const sample = oracle.fragments.find((fragment) => fragment.index === 1)?.words[0];
    expect(sample).toBeDefined();
    const book = await openOfflineEpubPositions(bytes, {
      bookId: "oracle_book",
      bookFileId: "oracle_file",
      editionSha256: createHash("sha256").update(bytes).digest("hex"),
      format: "EPUB",
    });
    const converted = book.convert({
      source: "XPOINTER",
      nativePosition: sample![0],
      expectedText: sample![2],
    });
    expect(converted.status).toBe("DOM_ANCHOR_MATCH");
    expect(converted.spineIndex).toBe(1);
    let matched = 0;
    let chapterOnly = 0;
    for (const fragment of oracle.fragments) {
      for (const [pointer, , word] of fragment.words) {
        const result = book.convert({
          source: "XPOINTER",
          nativePosition: pointer,
          expectedText: word,
        });
        expect(result.spineIndex).toBe(fragment.index);
        if (result.status === "DOM_ANCHOR_MATCH") {
          const reverse = book.convert({
            source: "CFI",
            nativePosition: result.targetPosition!,
            expectedText: word,
          });
          expect(reverse.status).toBe("DOM_ANCHOR_MATCH");
          expect(reverse.spineIndex).toBe(fragment.index);
          expect(reverse.textAnchorSha256).toBe(result.textAnchorSha256);
          matched++;
        } else {
          expect(result.status).toBe("CHAPTER_ONLY");
          expect(result.targetPosition).toBeNull();
          chapterOnly++;
        }
      }
    }
    expect(matched).toBe(313);
    expect(chapterOnly).toBe(23);
    expect(
      book.convert({
        source: "XPOINTER",
        nativePosition: "/body/DocFragment[3]/body/p[3]/text().5",
        expectedText: "two",
      }),
    ).toMatchObject({ status: "CHAPTER_ONLY", reason: "ANCHOR_MISMATCH", targetPosition: null });
  });

  it("loads real EPUB bytes and roundtrips a Thai XPointer through ProseReader", async () => {
    const { bytes, edition } = fixture();
    const book = await openOfflineEpubPositions(bytes, edition);
    expect(book.spineCount).toBe(2);
    const pointer = "/body/DocFragment[1]/body/p/text().0";
    const converted = book.convert({
      source: "XPOINTER",
      nativePosition: pointer,
      expectedText: "ภาษาไทย",
    });
    expect(converted).toMatchObject({
      status: "DOM_ANCHOR_MATCH",
      spineIndex: 0,
      spineId: "first",
      spineHref: "OEBPS/Text/chapter 1.xhtml",
      textAnchorSha256: createHash("sha256").update("ภาษาไทย").digest("hex"),
      percentage: null,
      evidence: "EPUB_DOM_ROUNDTRIP_ONLY",
    });
    expect(converted.targetPosition).toMatch(/^epubcfi\(/);
    const reverse = book.convert({
      source: "CFI",
      nativePosition: converted.targetPosition!,
      expectedText: "ภาษาไทย",
    });
    expect(reverse.status).toBe("DOM_ANCHOR_MATCH");
    expect(reverse.targetPosition).toBe(pointer);

    const secondChapter = book.convert({
      source: "XPOINTER",
      nativePosition: "/body/DocFragment[2]/body/p/text().0",
      expectedText: "บทที่สอง",
    });
    expect(secondChapter).toMatchObject({
      status: "DOM_ANCHOR_MATCH",
      spineIndex: 1,
      spineId: "second",
    });

    // crengine counts Unicode code points, while the DOM uses UTF-16 offsets.
    const text = "ภาษาไทย กำลังอ่าน 😀 ต่อไป";
    const prefix = text.slice(0, text.indexOf("ต่อไป"));
    const unicodePosition = `/body/DocFragment[1]/body/p/text().${Array.from(prefix).length}`;
    expect(
      book.convert({ source: "XPOINTER", nativePosition: unicodePosition, expectedText: "ต่อไป" }),
    ).toMatchObject({ status: "DOM_ANCHOR_MATCH", spineId: "first" });
  });

  it("preserves the native position when the quote or pointer cannot be proven", async () => {
    const { bytes, edition } = fixture();
    const book = await openOfflineEpubPositions(bytes, edition);
    const nativePosition = "/body/DocFragment[1]/body/p/text().0";
    expect(
      book.convert({ source: "XPOINTER", nativePosition, expectedText: "ข้อความอื่น" }),
    ).toMatchObject({
      status: "CHAPTER_ONLY",
      nativePosition,
      targetPosition: null,
    });
    expect(book.convert({ source: "XPOINTER", nativePosition })).toMatchObject({
      status: "CHAPTER_ONLY",
      nativePosition,
      targetPosition: null,
    });
    expect(book.convert({ source: "XPOINTER", nativePosition: "not-a-pointer" })).toMatchObject({
      status: "UNRESOLVED",
      nativePosition: "not-a-pointer",
      targetPosition: null,
    });
  });

  it("rejects a changed edition, unsafe manifest traversal, and XML entities", async () => {
    const valid = fixture();
    await expect(
      openOfflineEpubPositions(valid.bytes, { ...valid.edition, editionSha256: "0".repeat(64) }),
    ).rejects.toThrow("PHASE06_EDITION_MISMATCH");
    const traversal = fixture({
      "OEBPS/content.opf": opf.replace("Text/chapter%201.xhtml", "../../outside.xhtml"),
    });
    await expect(openOfflineEpubPositions(traversal.bytes, traversal.edition)).rejects.toThrow(
      "EPUB_UNSAFE_HREF",
    );
    const entity = fixture({
      "OEBPS/Text/chapter 1.xhtml": `<!DOCTYPE html [<!ENTITY x "BAD">]>${first}`,
    });
    await expect(openOfflineEpubPositions(entity.bytes, entity.edition)).rejects.toThrow(
      "EPUB_UNSAFE_XML",
    );
    const mime = fixture({ mimetype: "application/zip" });
    await expect(openOfflineEpubPositions(mime.bytes, mime.edition)).rejects.toThrow(
      "EPUB_MIMETYPE_INVALID",
    );
    const foreignNamespace = fixture({
      "OEBPS/content.opf": opf.replace("http://www.idpf.org/2007/opf", "urn:not-opf"),
    });
    await expect(
      openOfflineEpubPositions(foreignNamespace.bytes, foreignNamespace.edition),
    ).rejects.toThrow("EPUB_PACKAGE_INVALID");
  });

  it("binds the edition and archive snapshot before asynchronous parsing", async () => {
    const { bytes, edition } = fixture();
    const expected = edition.editionSha256;
    const pending = openOfflineEpubPositions(bytes, edition);
    edition.editionSha256 = "0".repeat(64);
    bytes.fill(0);
    expect((await pending).edition.editionSha256).toBe(expected);
  });
});
