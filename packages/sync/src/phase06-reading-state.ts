import { toOfflineEpubResumePosition, type OfflineEdition } from "./phase06.js";
import type { EpubDomConversion } from "./epub-position.js";
import { parseXPointer } from "@prose-reader/koreader";

const safeId = (value: unknown): value is string =>
  typeof value === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(value);
const safeStatus = (value: unknown): value is string =>
  typeof value === "string" &&
  value.length > 0 &&
  value.length <= 64 &&
  !/[\x00-\x1f\x7f]/.test(value);
const validIsoTimestamp = (value: unknown): value is string =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
  Number.isFinite(Date.parse(value));
const opaquePointer = (value: unknown, prefix: "xpointer" | "epubcfi"): value is string =>
  typeof value === "string" &&
  value.length > prefix.length + 1 &&
  value.length <= 2048 &&
  value.startsWith(prefix + "(/") &&
  value.endsWith(")") &&
  !/[\s\x00-\x1f\x7f<>%\\]/.test(value);
const validXPointer = (value: unknown): value is string =>
  typeof value === "string" &&
  value.length > 0 &&
  value.length <= 2048 &&
  parseXPointer(value) !== undefined;
const safeHref = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[A-Za-z0-9_\-./]{1,512}$/.test(value) &&
  !value.startsWith("/") &&
  value.split("/").every((segment) => segment.length > 0 && segment !== "." && segment !== "..");

function requireSameEdition(actual: OfflineEdition, expected: OfflineEdition): void {
  if (
    !actual ||
    actual.bookId !== expected.bookId ||
    actual.bookFileId !== expected.bookFileId ||
    actual.editionSha256 !== expected.editionSha256 ||
    actual.format !== expected.format
  )
    throw new Error("PHASE06_READING_STATE_EDITION_MISMATCH");
}

export type OfflineReadingStatePlan = Readonly<{
  mode: "OFFLINE_SIMULATION_ONLY";
  transport: "NONE";
  writeAttempted: false;
  edition: OfflineEdition;
  eventId: string;
  occurredAt: string;
  previousNativePosition: string | null;
  nativePosition: string;
  expectedOfficialCfi: string;
  spineHref: string;
  textAnchorSha256: string;
  positionEvidence: "EPUB_DOM_ROUNDTRIP_ONLY";
  previousReadStatus: string | null;
  plannedReadStatus: string | null;
  transition:
    | "SET_READING_FROM_UNREAD"
    | "SET_READING_FROM_UNSET"
    | "PRESERVE_EXISTING"
    | "STATUS_UNKNOWN";
  percentage: null;
}>;

/**
 * Plan the Phase06 status/resume decision without creating a network request.
 * Only a genuinely changed, edition-bound DOM position may produce a plan.
 * This does not assert that Grimmory's REST status side effects are verified.
 */
export function planOfflineReadingStateBridge(
  input: Readonly<{
    edition: OfflineEdition;
    eventId: string;
    occurredAt: string;
    conversion: EpubDomConversion;
    previous: Readonly<{
      edition: OfflineEdition;
      nativePosition: string | null;
      readStatus: string | null;
    }>;
  }>,
): OfflineReadingStatePlan {
  if (!input || input.edition.format !== "EPUB")
    throw new Error("PHASE06_READING_STATE_EDITION_INVALID");
  requireSameEdition(input.previous.edition, input.edition);
  if (!safeId(input.eventId) || !validIsoTimestamp(input.occurredAt))
    throw new Error("PHASE06_READING_STATE_EVENT_INVALID");

  const conversion = input.conversion;
  if (
    !conversion ||
    conversion.status !== "DOM_ANCHOR_MATCH" ||
    conversion.reason !== null ||
    conversion.evidence !== "EPUB_DOM_ROUNDTRIP_ONLY" ||
    conversion.percentage !== null ||
    !safeHref(conversion.spineHref) ||
    !Number.isSafeInteger(conversion.spineIndex) ||
    conversion.spineIndex === null ||
    conversion.spineIndex < 0 ||
    typeof conversion.spineId !== "string" ||
    conversion.spineId.length === 0 ||
    conversion.spineId.length > 128 ||
    !/^[a-f0-9]{64}$/.test(conversion.textAnchorSha256 ?? "")
  )
    throw new Error("PHASE06_DOM_ANCHOR_REQUIRED");

  const sourcePositionValid =
    conversion.source === "XPOINTER"
      ? validXPointer(conversion.nativePosition)
      : opaquePointer(conversion.nativePosition, "epubcfi");
  const targetPositionValid =
    conversion.source === "XPOINTER"
      ? opaquePointer(conversion.targetPosition, "epubcfi")
      : validXPointer(conversion.targetPosition);
  if (!sourcePositionValid || !targetPositionValid)
    throw new Error("PHASE06_READING_STATE_POSITION_INVALID");
  if (
    input.previous.nativePosition !== null &&
    !(conversion.source === "XPOINTER"
      ? validXPointer(input.previous.nativePosition)
      : opaquePointer(input.previous.nativePosition, "epubcfi"))
  )
    throw new Error("PHASE06_READING_STATE_POSITION_INVALID");
  if (input.previous.nativePosition === conversion.nativePosition)
    throw new Error("PHASE06_POSITION_NOT_CHANGED");
  if (input.previous.readStatus !== null && !safeStatus(input.previous.readStatus))
    throw new Error("PHASE06_READING_STATE_STATUS_INVALID");

  const verifiedPosition = toOfflineEpubResumePosition(conversion);
  const textAnchorSha256 = conversion.textAnchorSha256;
  const expectedOfficialCfi =
    conversion.source === "XPOINTER" ? conversion.targetPosition : conversion.nativePosition;
  if (!textAnchorSha256 || !expectedOfficialCfi) throw new Error("PHASE06_DOM_ANCHOR_REQUIRED");
  const transition =
    input.previous.readStatus === "UNREAD"
      ? "SET_READING_FROM_UNREAD"
      : input.previous.readStatus === "UNSET"
        ? "SET_READING_FROM_UNSET"
        : input.previous.readStatus === null
          ? "STATUS_UNKNOWN"
          : "PRESERVE_EXISTING";
  const plannedReadStatus =
    transition === "SET_READING_FROM_UNREAD" || transition === "SET_READING_FROM_UNSET"
      ? "READING"
      : input.previous.readStatus;

  return Object.freeze({
    mode: "OFFLINE_SIMULATION_ONLY",
    transport: "NONE",
    writeAttempted: false,
    edition: Object.freeze({ ...input.edition }),
    eventId: input.eventId,
    occurredAt: input.occurredAt,
    previousNativePosition: input.previous.nativePosition,
    nativePosition: verifiedPosition.nativePosition,
    expectedOfficialCfi,
    spineHref: conversion.spineHref,
    textAnchorSha256,
    positionEvidence: verifiedPosition.evidence,
    previousReadStatus: input.previous.readStatus,
    plannedReadStatus,
    transition,
    percentage: null,
  });
}

export type SimulatedOfficialReadingState = Readonly<{
  source: "SIMULATED_OFFICIAL_RESPONSE";
  edition: OfflineEdition;
  response: Readonly<{
    readStatus: string | null;
    readProgress: number | null;
    lastReadTime: string | null;
    epubProgress: Readonly<{
      cfi: string | null;
      href: string | null;
      percentage: number | null;
    }> | null;
  }>;
}>;

/** Evaluate only an explicitly labeled simulated Official readback fixture. */
export function verifySimulatedOfficialReadingState(
  plan: OfflineReadingStatePlan,
  simulated: SimulatedOfficialReadingState,
) {
  if (!plan || plan.mode !== "OFFLINE_SIMULATION_ONLY" || plan.writeAttempted)
    throw new Error("PHASE06_READING_STATE_PLAN_INVALID");
  if (!simulated || simulated.source !== "SIMULATED_OFFICIAL_RESPONSE")
    throw new Error("PHASE06_READING_STATE_SIMULATION_REQUIRED");
  requireSameEdition(simulated.edition, plan.edition);

  const response = simulated.response;
  if (
    !response ||
    (response.readStatus !== null && !safeStatus(response.readStatus)) ||
    (response.readProgress !== null &&
      (typeof response.readProgress !== "number" || !Number.isFinite(response.readProgress))) ||
    (response.lastReadTime !== null && !validIsoTimestamp(response.lastReadTime))
  )
    throw new Error("PHASE06_READING_STATE_READBACK_INVALID");

  const epub = response.epubProgress;
  if (
    epub !== null &&
    (!epub ||
      (epub.cfi !== null && !opaquePointer(epub.cfi, "epubcfi")) ||
      (epub.href !== null && !safeHref(epub.href)) ||
      (epub.percentage !== null &&
        (typeof epub.percentage !== "number" || !Number.isFinite(epub.percentage))))
  )
    throw new Error("PHASE06_READING_STATE_READBACK_INVALID");

  const exactPositionReadback =
    epub?.cfi === plan.expectedOfficialCfi && epub.href === plan.spineHref;
  const readStatusOutcome =
    plan.plannedReadStatus === null
      ? "NOT_EVALUATED"
      : response.readStatus === plan.plannedReadStatus
        ? "READBACK_MATCH"
        : "READBACK_MISMATCH";
  const diagnostics: string[] = [];
  if (readStatusOutcome === "READBACK_MISMATCH") diagnostics.push("READ_STATUS_READBACK_MISMATCH");
  if (!exactPositionReadback) diagnostics.push("EXACT_POSITION_NOT_READ_BACK");
  if (response.readProgress === 0) diagnostics.push("OFFICIAL_0_PERCENT_CARD_NOT_GUARANTEED");

  return Object.freeze({
    mode: "OFFLINE_SIMULATED_READBACK_ONLY" as const,
    writeAttempted: false as const,
    eventId: plan.eventId,
    transition: plan.transition,
    readStatusOutcome,
    readStatus: response.readStatus,
    lastReadTime: response.lastReadTime,
    readProgress: response.readProgress,
    epubProgressPercentage: epub?.percentage ?? null,
    percentageInvented: false as const,
    resume: exactPositionReadback ? ("EXACT_RESUME" as const) : ("LOCAL_STARTED_READING" as const),
    positionReadback: exactPositionReadback ? ("MATCH" as const) : ("NOT_EXACT" as const),
    officialCardVisibility:
      response.readProgress === 0
        ? ("NOT_GUARANTEED_AT_0_0_PERCENT" as const)
        : ("NOT_PROVEN" as const),
    diagnostics: Object.freeze(diagnostics),
  });
}
