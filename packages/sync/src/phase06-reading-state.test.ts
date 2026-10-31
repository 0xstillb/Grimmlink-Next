import { createHash } from "node:crypto";
import { strToU8, zipSync } from "fflate";
import { expect, it } from "vitest";
import { openOfflineEpubPositions } from "./epub-position.js";
import {
  planOfflineReadingStateBridge,
  verifySimulatedOfficialReadingState,
} from "./phase06-reading-state.js";

const files = {
  mimetype: "application/epub+zip",
  "META-INF/container.xml": `<?xml version="1.0"?>
<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">
  <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`,
  "OEBPS/content.opf": `<?xml version="1.0"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book">
  <manifest><item id="chapter" href="chapter%20thai.xhtml" media-type="application/xhtml+xml"/></manifest>
  <spine><itemref idref="chapter"/></spine>
</package>`,
  "OEBPS/chapter thai.xhtml": `<html xmlns="http://www.w3.org/1999/xhtml"><head><title>ไทย</title></head><body><p>เริ่มอ่านตรงนี้</p></body></html>`,
};
const bytes = zipSync(
  Object.fromEntries(Object.entries(files).map(([name, value]) => [name, strToU8(value)])),
);
const edition = {
  bookId: "book_1",
  bookFileId: "file_1",
  editionSha256: createHash("sha256").update(bytes).digest("hex"),
  format: "EPUB" as const,
};
const occurredAt = "2026-10-31T10:00:00.000Z";

async function getConversion() {
  const book = await openOfflineEpubPositions(bytes, edition);
  const conversion = book.convert({
    source: "XPOINTER",
    nativePosition: "/body/DocFragment[1]/body/p/text().0",
    expectedText: "เริ่มอ่าน",
  });
  return { conversion, previousPosition: "/body/DocFragment[1]/body/p/text().4" };
}

it("plans READING only from UNREAD and confirms exact resume from simulated readback", async () => {
  const { conversion, previousPosition } = await getConversion();
  const plan = planOfflineReadingStateBridge({
    edition,
    eventId: "reader_event_1",
    occurredAt,
    conversion,
    previous: { edition, nativePosition: previousPosition, readStatus: "UNREAD" },
  });

  expect(plan).toMatchObject({
    mode: "OFFLINE_SIMULATION_ONLY",
    transport: "NONE",
    writeAttempted: false,
    transition: "SET_READING_FROM_UNREAD",
    plannedReadStatus: "READING",
    percentage: null,
    positionEvidence: "EPUB_DOM_ROUNDTRIP_ONLY",
  });
  const verified = verifySimulatedOfficialReadingState(plan, {
    source: "SIMULATED_OFFICIAL_RESPONSE",
    edition,
    response: {
      readStatus: "READING",
      lastReadTime: occurredAt,
      readProgress: 0,
      epubProgress: {
        cfi: conversion.targetPosition,
        href: conversion.spineHref,
        percentage: null,
      },
    },
  });

  expect(verified).toMatchObject({
    mode: "OFFLINE_SIMULATED_READBACK_ONLY",
    writeAttempted: false,
    readStatusOutcome: "READBACK_MATCH",
    readStatus: "READING",
    lastReadTime: occurredAt,
    readProgress: 0,
    percentageInvented: false,
    resume: "EXACT_RESUME",
    positionReadback: "MATCH",
    officialCardVisibility: "NOT_GUARANTEED_AT_0_0_PERCENT",
  });
  expect(verified.diagnostics).toContain("OFFICIAL_0_PERCENT_CARD_NOT_GUARANTEED");
});

it("preserves READ, PAUSED, RE_READING and unknown manually selected statuses", async () => {
  const { conversion, previousPosition } = await getConversion();
  for (const readStatus of ["READ", "PAUSED", "RE_READING", "CUSTOM_MANUAL_STATUS"]) {
    const plan = planOfflineReadingStateBridge({
      edition,
      eventId: `event_${readStatus.toLowerCase()}`,
      occurredAt,
      conversion,
      previous: { edition, nativePosition: previousPosition, readStatus },
    });
    expect(plan.transition).toBe("PRESERVE_EXISTING");
    expect(plan.plannedReadStatus).toBe(readStatus);
  }

  const unset = planOfflineReadingStateBridge({
    edition,
    eventId: "event_unset",
    occurredAt,
    conversion,
    previous: { edition, nativePosition: previousPosition, readStatus: "UNSET" },
  });
  expect(unset).toMatchObject({
    transition: "SET_READING_FROM_UNSET",
    plannedReadStatus: "READING",
  });
});

it("rejects unchanged positions, cross-edition state, and non-exact DOM conversion", async () => {
  const { conversion, previousPosition } = await getConversion();
  const base = {
    edition,
    eventId: "event_invalid",
    occurredAt,
    conversion,
    previous: { edition, nativePosition: previousPosition, readStatus: "UNREAD" },
  };
  expect(() =>
    planOfflineReadingStateBridge({
      ...base,
      previous: { ...base.previous, nativePosition: conversion.nativePosition },
    }),
  ).toThrow("PHASE06_POSITION_NOT_CHANGED");
  expect(() =>
    planOfflineReadingStateBridge({
      ...base,
      previous: { ...base.previous, edition: { ...edition, bookFileId: "other_file" } },
    }),
  ).toThrow("PHASE06_READING_STATE_EDITION_MISMATCH");
  expect(() =>
    planOfflineReadingStateBridge({
      ...base,
      conversion: { ...conversion, status: "CHAPTER_ONLY", targetPosition: null },
    }),
  ).toThrow("PHASE06_DOM_ANCHOR_REQUIRED");
});

it("reports status and exact-position readback mismatches without inventing progress", async () => {
  const { conversion, previousPosition } = await getConversion();
  const plan = planOfflineReadingStateBridge({
    edition,
    eventId: "reader_event_2",
    occurredAt,
    conversion,
    previous: { edition, nativePosition: previousPosition, readStatus: "UNREAD" },
  });
  const verified = verifySimulatedOfficialReadingState(plan, {
    source: "SIMULATED_OFFICIAL_RESPONSE",
    edition,
    response: {
      readStatus: "UNREAD",
      lastReadTime: null,
      readProgress: null,
      epubProgress: null,
    },
  });
  expect(verified).toMatchObject({
    readStatusOutcome: "READBACK_MISMATCH",
    lastReadTime: null,
    readProgress: null,
    percentageInvented: false,
    resume: "LOCAL_STARTED_READING",
    positionReadback: "NOT_EXACT",
    officialCardVisibility: "NOT_PROVEN",
  });
  expect(verified.diagnostics).toContain("READ_STATUS_READBACK_MISMATCH");
  expect(verified.diagnostics).toContain("EXACT_POSITION_NOT_READ_BACK");
});
