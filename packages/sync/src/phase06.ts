import { createHash } from "node:crypto";
import type { EpubDomConversion } from "./epub-position.js";

/**
 * Phase06 strictly offline/mock position handling.
 * Never infer a CFI from an XPointer syntactically: only exact, edition-bound
 * anchor pairs extracted and checked by a future trusted EPUB parser may bridge.
 * These fixture pairs do NOT prove actual KOReader/Readest interoperability.
 */
export type OfflineEdition = Readonly<{
  bookId: string;
  bookFileId: string;
  editionSha256: string;
  format: "EPUB" | "PDF";
}>;

export type EpubAnchorPair = Readonly<{
  anchorId: string;
  spineHref: string;
  textAnchor: string;
  xpointer: string;
  cfi: string;
}>;

export type OfflineEpubResumePosition = Readonly<{
  kind: "EPUB_EXACT";
  anchorId: string;
  nativePosition: string;
  evidence: "EPUB_DOM_ROUNDTRIP_ONLY";
}>;

/** Preserve the reader's source pointer while carrying the DOM proof separately. */
export function toOfflineEpubResumePosition(
  conversion: EpubDomConversion,
): OfflineEpubResumePosition {
  if (
    !conversion ||
    conversion.status !== "DOM_ANCHOR_MATCH" ||
    !conversion.targetPosition ||
    conversion.spineIndex === null ||
    conversion.spineId === null ||
    conversion.spineHref === null ||
    !conversion.textAnchorSha256
  )
    throw new Error("PHASE06_DOM_ANCHOR_REQUIRED");
  const anchorId =
    "dom_" +
    createHash("sha256")
      .update(
        JSON.stringify([
          conversion.spineIndex,
          conversion.spineId,
          conversion.spineHref,
          conversion.nativePosition,
          conversion.textAnchorSha256,
        ]),
      )
      .digest("hex");
  return Object.freeze({
    kind: "EPUB_EXACT",
    anchorId,
    nativePosition: conversion.nativePosition,
    evidence: "EPUB_DOM_ROUNDTRIP_ONLY",
  });
}

const safeId = (value: unknown): value is string =>
  typeof value === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(value);
const hash = (value: string): string => createHash("sha256").update(value, "utf8").digest("hex");
const validSha = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const cleanOpaque = (value: unknown, prefix: string): value is string =>
  typeof value === "string" &&
  value.length > prefix.length + 1 &&
  value.length <= 2048 &&
  value.startsWith(prefix + "(/") &&
  value.endsWith(")") &&
  !/[\s\x00-\x1f\x7f<>%\\]/.test(value) &&
  value.indexOf(")") === value.length - 1;

export function requireOfflineEdition(input: OfflineEdition): void {
  if (
    !input ||
    !safeId(input.bookId) ||
    !safeId(input.bookFileId) ||
    !validSha(input.editionSha256) ||
    (input.format !== "EPUB" && input.format !== "PDF")
  )
    throw new Error("PHASE06_EDITION_INVALID");
}

function assertSameEdition(actual: OfflineEdition, expected: OfflineEdition): void {
  requireOfflineEdition(actual);
  requireOfflineEdition(expected);
  if (
    actual.bookId !== expected.bookId ||
    actual.bookFileId !== expected.bookFileId ||
    actual.editionSha256 !== expected.editionSha256 ||
    actual.format !== expected.format
  )
    throw new Error("PHASE06_EDITION_MISMATCH");
}

/**
 * No DOM or EPUB traversal happens here. Caller must supply a trustworthy,
 * exact same-book/edition/spine/text anchor catalog. Until Phase09, the only
 * approved caller is a synthetic offline fixture, NOT a live reader route.
 */
export function buildOfflineEpubAnchorMap(
  edition: OfflineEdition,
  pairs: readonly EpubAnchorPair[],
) {
  requireOfflineEdition(edition);
  if (edition.format !== "EPUB" || !Array.isArray(pairs) || pairs.length < 1 || pairs.length > 1024)
    throw new Error("PHASE06_ANCHOR_CATALOG_INVALID");

  const xp = new Map<string, EpubAnchorPair>();
  const cf = new Map<string, EpubAnchorPair>();
  const ids = new Set<string>();
  const fingerprints = new Map<string, string>();
  for (const pair of pairs) {
    if (
      !pair ||
      !safeId(pair.anchorId) ||
      !/^[A-Za-z0-9_\-./]{1,512}$/.test(pair.spineHref) ||
      pair.spineHref.startsWith("/") ||
      pair.spineHref
        .split("/")
        .some((segment: string) => !segment || segment === "." || segment === "..") ||
      typeof pair.textAnchor !== "string" ||
      pair.textAnchor.length < 1 ||
      pair.textAnchor.length > 1024 ||
      /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(pair.textAnchor) ||
      !cleanOpaque(pair.xpointer, "xpointer") ||
      !cleanOpaque(pair.cfi, "epubcfi")
    )
      throw new Error("PHASE06_ANCHOR_INVALID");
    // No ambiguous aliases or silent overwrites, even when text is identical.
    const fingerprint = hash(pair.textAnchor);
    const key = pair.spineHref + "\u0000" + fingerprint;
    if (
      ids.has(pair.anchorId) ||
      xp.has(pair.xpointer) ||
      cf.has(pair.cfi) ||
      fingerprints.has(key)
    )
      throw new Error("PHASE06_ANCHOR_AMBIGUOUS");
    ids.add(pair.anchorId);
    xp.set(pair.xpointer, pair);
    cf.set(pair.cfi, pair);
    fingerprints.set(key, pair.anchorId);
  }

  return Object.freeze({
    evidence: "OFFLINE_SYNTHETIC_FIXTURE_ONLY" as const,
    anchorCount: pairs.length,
    convert(
      input: Readonly<{
        edition: OfflineEdition;
        source: "XPOINTER" | "CFI";
        nativePosition: string;
        spineHref: string;
        textAnchor: string;
      }>,
    ) {
      assertSameEdition(input.edition, edition);
      if (
        (input.source !== "XPOINTER" && input.source !== "CFI") ||
        typeof input.nativePosition !== "string" ||
        typeof input.spineHref !== "string" ||
        typeof input.textAnchor !== "string"
      )
        throw new Error("PHASE06_POSITION_INVALID");
      const pair = (input.source === "XPOINTER" ? xp : cf).get(input.nativePosition);
      if (!pair || pair.spineHref !== input.spineHref || pair.textAnchor !== input.textAnchor)
        throw new Error("PHASE06_EXACT_ANCHOR_NOT_FOUND");
      return Object.freeze({
        match: "EXACT" as const,
        anchorId: pair.anchorId,
        spineHref: pair.spineHref,
        textAnchorSha256: hash(pair.textAnchor),
        sourcePosition: input.nativePosition,
        targetFormat: input.source === "XPOINTER" ? ("CFI" as const) : ("XPOINTER" as const),
        targetPosition: input.source === "XPOINTER" ? pair.cfi : pair.xpointer,
        editionSha256: edition.editionSha256,
        evidence: "OFFLINE_SYNTHETIC_FIXTURE_ONLY" as const,
      });
    },
  });
}

/** A PDF page is one-based. No invented fraction within the page or EPUB mapping. */
export function validateOfflinePdfPage(
  edition: OfflineEdition,
  input: Readonly<{
    edition: OfflineEdition;
    pageNumber: number;
    pageCount: number;
    verifiedFixturePageCount: number;
  }>,
) {
  assertSameEdition(input.edition, edition);
  if (
    edition.format !== "PDF" ||
    !Number.isSafeInteger(input.pageNumber) ||
    !Number.isSafeInteger(input.pageCount) ||
    !Number.isSafeInteger(input.verifiedFixturePageCount) ||
    input.pageCount < 1 ||
    input.pageCount > 100000 ||
    input.verifiedFixturePageCount !== input.pageCount ||
    input.pageNumber < 1 ||
    input.pageNumber > input.pageCount
  )
    throw new Error("PHASE06_PDF_PAGE_UNVERIFIED");
  return Object.freeze({
    kind: "PDF_PAGE" as const,
    pageNumber: input.pageNumber,
    pageCount: input.pageCount,
    label: "Page " + input.pageNumber + " of " + input.pageCount,
    percentage: null,
    editionSha256: edition.editionSha256,
    evidence: "OFFLINE_SYNTHETIC_FIXTURE_ONLY" as const,
  });
}

/** Convert page indexes only when the same PDF edition and page count are known. */
export function mapOfflinePdfPage(
  edition: OfflineEdition,
  input: Readonly<{
    edition: OfflineEdition;
    pageIndex: number;
    sourceBase: 0 | 1;
    targetBase: 0 | 1;
    pageCount: number;
    verifiedFixturePageCount: number;
  }>,
) {
  if (
    (input.sourceBase !== 0 && input.sourceBase !== 1) ||
    (input.targetBase !== 0 && input.targetBase !== 1) ||
    !Number.isSafeInteger(input.pageIndex)
  )
    throw new Error("PHASE06_PDF_PAGE_UNVERIFIED");
  const pageNumber = input.sourceBase === 0 ? input.pageIndex + 1 : input.pageIndex;
  const checked = validateOfflinePdfPage(edition, {
    edition: input.edition,
    pageNumber,
    pageCount: input.pageCount,
    verifiedFixturePageCount: input.verifiedFixturePageCount,
  });
  return Object.freeze({
    ...checked,
    sourceIndex: input.pageIndex,
    sourceBase: input.sourceBase,
    targetIndex: input.targetBase === 0 ? pageNumber - 1 : pageNumber,
    targetBase: input.targetBase,
  });
}

export type OfflineResumeEvent = Readonly<{
  edition: OfflineEdition;
  revision: number;
  eventId: string;
  position: Readonly<
    | { kind: "EPUB_EXACT"; anchorId: string; nativePosition: string }
    | { kind: "PDF_PAGE"; pageNumber: number; pageCount: number }
  >;
}>;

/**
 * Local-only Continue Reading projection. Server revision ordering wins;
 * neither a device clock nor a larger page/percentage is used to pick a winner.
 * Exact same-revision divergent events fail closed instead of guess/last-writer.
 */
export function projectOfflineContinueReading(
  edition: OfflineEdition,
  events: readonly OfflineResumeEvent[],
) {
  requireOfflineEdition(edition);
  if (!Array.isArray(events) || events.length > 4096)
    throw new Error("PHASE06_RESUME_EVENTS_INVALID");
  let latest: OfflineResumeEvent | null = null;
  for (const event of events) {
    if (
      !event ||
      !safeId(event.eventId) ||
      !Number.isSafeInteger(event.revision) ||
      event.revision < 1
    )
      throw new Error("PHASE06_RESUME_EVENT_INVALID");
    assertSameEdition(event.edition, edition);
    const p = event.position;
    if (
      !p ||
      (p.kind === "EPUB_EXACT" &&
        (edition.format !== "EPUB" ||
          !safeId(p.anchorId) ||
          typeof p.nativePosition !== "string" ||
          (!cleanOpaque(p.nativePosition, "xpointer") &&
            !cleanOpaque(p.nativePosition, "epubcfi")))) ||
      (p.kind === "PDF_PAGE" &&
        (edition.format !== "PDF" ||
          !Number.isSafeInteger(p.pageNumber) ||
          !Number.isSafeInteger(p.pageCount) ||
          p.pageNumber < 1 ||
          p.pageCount < p.pageNumber)) ||
      (p.kind !== "EPUB_EXACT" && p.kind !== "PDF_PAGE")
    )
      throw new Error("PHASE06_RESUME_POSITION_INVALID");
    if (!latest || event.revision > latest.revision) {
      latest = event;
    } else if (
      event.revision === latest.revision &&
      (event.eventId !== latest.eventId ||
        JSON.stringify(event.position) !== JSON.stringify(latest.position))
    )
      throw new Error("PHASE06_RESUME_REVISION_CONFLICT");
  }
  if (!latest) return Object.freeze({ status: "NO_POSITION" as const, percentage: null });
  const label =
    latest.position.kind === "PDF_PAGE"
      ? "Page " + latest.position.pageNumber + " of " + latest.position.pageCount
      : "Resume at exact EPUB anchor";
  return Object.freeze({
    status: "LOCAL_PREVIEW_ONLY" as const,
    edition,
    revision: latest.revision,
    eventId: latest.eventId,
    position: latest.position,
    label,
    percentage: null,
  });
}
