import { expect, it } from "vitest";
import {
  buildOfflineEpubAnchorMap,
  projectOfflineContinueReading,
  requireOfflineEdition,
  validateOfflinePdfPage,
  type OfflineEdition,
} from "./phase06.js";

const epub: OfflineEdition = {
  bookId: "book_1",
  bookFileId: "file_1",
  editionSha256: "a".repeat(64),
  format: "EPUB",
};
const pdf: OfflineEdition = {
  ...epub,
  bookFileId: "pdf_1",
  editionSha256: "b".repeat(64),
  format: "PDF",
};
const anchors = [
  {
    anchorId: "chapter_1_paragraph_1",
    spineHref: "OEBPS/Text/chapter1.xhtml",
    textAnchor: "A first line with ไทย and 中文.",
    xpointer: "xpointer(/body/DocFragment[1]/body/p[1].0)",
    cfi: "epubcfi(/6/2[chapter1]!/4/2/2:0)",
  },
  {
    anchorId: "chapter_2_paragraph_1",
    spineHref: "OEBPS/Text/chapter2.xhtml",
    textAnchor: "The second chapter.",
    xpointer: "xpointer(/body/DocFragment[2]/body/p[1].0)",
    cfi: "epubcfi(/6/4[chapter2]!/4/2/2:0)",
  },
] as const;

it("roundtrips exact synthetic XPointer <-> CFI with chapter/text/edition evidence", () => {
  const bridge = buildOfflineEpubAnchorMap(epub, anchors);
  expect(bridge.anchorCount).toBe(2);
  const forward = bridge.convert({
    edition: epub,
    source: "XPOINTER",
    nativePosition: anchors[0].xpointer,
    spineHref: anchors[0].spineHref,
    textAnchor: anchors[0].textAnchor,
  });
  expect(forward.match).toBe("EXACT");
  expect(forward.evidence).toBe("OFFLINE_SYNTHETIC_FIXTURE_ONLY");
  expect(forward.targetPosition).toBe(anchors[0].cfi);
  const reverse = bridge.convert({
    edition: epub,
    source: "CFI",
    nativePosition: forward.targetPosition,
    spineHref: anchors[0].spineHref,
    textAnchor: anchors[0].textAnchor,
  });
  expect(reverse.targetPosition).toBe(anchors[0].xpointer);
  expect(reverse.textAnchorSha256).toMatch(/^[a-f0-9]{64}$/);
});

it("rejects different book/file/edition, chapter, anchor text, unlisted position and malformed pairs", () => {
  const bridge = buildOfflineEpubAnchorMap(epub, anchors);
  const request = {
    edition: epub,
    source: "CFI" as const,
    nativePosition: anchors[0].cfi,
    spineHref: anchors[0].spineHref,
    textAnchor: anchors[0].textAnchor,
  };
  expect(() =>
    bridge.convert({ ...request, edition: { ...epub, editionSha256: "c".repeat(64) } }),
  ).toThrow("PHASE06_EDITION_MISMATCH");
  expect(() => bridge.convert({ ...request, edition: { ...epub, bookFileId: "file_2" } })).toThrow(
    "PHASE06_EDITION_MISMATCH",
  );
  expect(() => bridge.convert({ ...request, spineHref: anchors[1].spineHref })).toThrow(
    "PHASE06_EXACT_ANCHOR_NOT_FOUND",
  );
  expect(() => bridge.convert({ ...request, textAnchor: "The second chapter." })).toThrow(
    "PHASE06_EXACT_ANCHOR_NOT_FOUND",
  );
  expect(() => bridge.convert({ ...request, nativePosition: "epubcfi(/6/999!/2:0)" })).toThrow(
    "PHASE06_EXACT_ANCHOR_NOT_FOUND",
  );
  expect(() =>
    buildOfflineEpubAnchorMap(epub, [anchors[0], { ...anchors[0], anchorId: "duplicate" }]),
  ).toThrow("PHASE06_ANCHOR_AMBIGUOUS");
  expect(() =>
    buildOfflineEpubAnchorMap(epub, [{ ...anchors[0], spineHref: "../bad.xhtml" }]),
  ).toThrow("PHASE06_ANCHOR_INVALID");
  expect(() =>
    buildOfflineEpubAnchorMap(epub, [{ ...anchors[0], cfi: "epubcfi(/6/2)%2e" }]),
  ).toThrow("PHASE06_ANCHOR_INVALID");
  expect(() => requireOfflineEdition({ ...epub, editionSha256: "xyz" })).toThrow(
    "PHASE06_EDITION_INVALID",
  );
  expect(() => buildOfflineEpubAnchorMap(pdf, anchors)).toThrow("PHASE06_ANCHOR_CATALOG_INVALID");
});

it("accepts page-accurate PDF mock only with known matching page count; never guesses a percent", () => {
  const ok = validateOfflinePdfPage(pdf, {
    edition: pdf,
    pageNumber: 11,
    pageCount: 120,
    verifiedFixturePageCount: 120,
  });
  expect(ok.label).toBe("Page 11 of 120");
  expect(ok.percentage).toBeNull();
  for (const [pageNumber, pageCount, verifiedFixturePageCount] of [
    [0, 120, 120],
    [121, 120, 120],
    [11, 120, 119],
    [1.4, 120, 120],
    [11, 0, 0],
    [11, Number.NaN, 120],
  ]) {
    expect(() =>
      validateOfflinePdfPage(pdf, {
        edition: pdf,
        pageNumber,
        pageCount,
        verifiedFixturePageCount,
      }),
    ).toThrow("PHASE06_PDF_PAGE_UNVERIFIED");
  }
  expect(() =>
    validateOfflinePdfPage(pdf, {
      edition: epub,
      pageNumber: 1,
      pageCount: 2,
      verifiedFixturePageCount: 2,
    }),
  ).toThrow("PHASE06_EDITION_MISMATCH");
});

it("Continue Reading chooses server revision instead of clock/page, fails on same-revision conflicts", () => {
  const old = {
    edition: pdf,
    revision: 3,
    eventId: "reader_a",
    position: { kind: "PDF_PAGE" as const, pageNumber: 100, pageCount: 120 },
  };
  const recent = {
    edition: pdf,
    revision: 4,
    eventId: "reader_b",
    position: { kind: "PDF_PAGE" as const, pageNumber: 12, pageCount: 120 },
  };
  const preview = projectOfflineContinueReading(pdf, [recent, old]);
  expect(preview.status).toBe("LOCAL_PREVIEW_ONLY");
  if (preview.status !== "LOCAL_PREVIEW_ONLY") throw new Error("missing preview");
  expect(preview.revision).toBe(4);
  expect(preview.label).toBe("Page 12 of 120");
  expect(preview.percentage).toBeNull();
  expect(projectOfflineContinueReading(pdf, []).status).toBe("NO_POSITION");
  expect(() =>
    projectOfflineContinueReading(pdf, [old, { ...old, eventId: "replay_conflict" }]),
  ).toThrow("PHASE06_RESUME_REVISION_CONFLICT");
  expect(() => projectOfflineContinueReading(pdf, [{ ...old, edition: epub }])).toThrow(
    "PHASE06_EDITION_MISMATCH",
  );
  expect(() =>
    projectOfflineContinueReading(pdf, [
      {
        ...old,
        position: {
          kind: "PDF_PAGE" as const,
          pageNumber: 200,
          pageCount: 120,
        },
      },
    ]),
  ).toThrow("PHASE06_RESUME_POSITION_INVALID");
  const epubPreview = projectOfflineContinueReading(epub, [
    {
      edition: epub,
      revision: 1,
      eventId: "epub1",
      position: {
        kind: "EPUB_EXACT",
        anchorId: anchors[0].anchorId,
        nativePosition: anchors[0].cfi,
      },
    },
  ]);
  expect(epubPreview.status).toBe("LOCAL_PREVIEW_ONLY");
  expect(epubPreview.percentage).toBeNull();
});
