/**
 * Phase07 pure, OFFLINE-ONLY personal-data contracts.
 * No Official API, credentials, or automatic sync in this package.
 */
export const personalWriteCapability = Object.freeze({
  rating: false,
  bookmarks: false,
  annotations: false,
  sessionOutboxTransmit: false,
  resetProgress: false,
} as const);

export function assertPersonalWriteAuthorized(): never {
  throw new Error("PERSONAL_BRIDGE_DISABLED_PHASE09");
}

export type OfflinePersonalKind = "RATING" | "BOOKMARK" | "ANNOTATION";
export type OfflinePersonalValue =
  | Readonly<{ kind: "RATING"; score: number }>
  | Readonly<{ kind: "BOOKMARK"; nativePosition: string; label: string }>
  | Readonly<{ kind: "ANNOTATION"; nativePosition: string; quote: string; note: string }>;

const cleanText = (value: unknown, max: number): value is string =>
  typeof value === "string" &&
  value.length > 0 &&
  value.length <= max &&
  !/[\u0000-\u001f\u007f]/.test(value);
const cleanOptionalText = (value: unknown, max: number): value is string =>
  typeof value === "string" && value.length <= max && !/[\u0000-\u001f\u007f]/.test(value);
const cleanPosition = (value: unknown): value is string =>
  cleanText(value, 2048) &&
  (value.startsWith("epubcfi(/") || value.startsWith("xpointer(/")) &&
  value.endsWith(")") &&
  !/[<>%\\]/.test(value);

export function validateOfflinePersonalValue(value: unknown): OfflinePersonalValue {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("PHASE07_PERSONAL_PAYLOAD_INVALID");
  const p = value as Record<string, unknown>;
  const keys = Object.keys(p).sort().join(",");
  if (
    p.kind === "RATING" &&
    keys === "kind,score" &&
    Number.isSafeInteger(p.score) &&
    typeof p.score === "number" &&
    p.score >= 1 &&
    p.score <= 5
  )
    return Object.freeze({ kind: "RATING", score: p.score });
  if (
    p.kind === "BOOKMARK" &&
    keys === "kind,label,nativePosition" &&
    cleanPosition(p.nativePosition) &&
    cleanOptionalText(p.label, 160)
  )
    return Object.freeze({
      kind: "BOOKMARK",
      nativePosition: p.nativePosition,
      label: p.label,
    });
  if (
    p.kind === "ANNOTATION" &&
    keys === "kind,nativePosition,note,quote" &&
    cleanPosition(p.nativePosition) &&
    cleanText(p.quote, 2000) &&
    cleanOptionalText(p.note, 2000)
  )
    return Object.freeze({
      kind: "ANNOTATION",
      nativePosition: p.nativePosition,
      quote: p.quote,
      note: p.note,
    });
  throw new Error("PHASE07_PERSONAL_PAYLOAD_INVALID");
}

export type OfflineShelfPlan = Readonly<{
  mode: "MANUAL_PREVIEW_ONLY";
  add: readonly string[];
  remove: readonly string[];
  unchanged: readonly string[];
}>;

const safeFileId = (value: unknown): value is string =>
  typeof value === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(value);

/**
 * Deterministic, manual-trigger dry run; cannot mutate Grimmory/Readest shelf
 * membership. The caller must separately verify every book-file ownership.
 */
export function planOfflineShelf(
  trigger: "MANUAL_OWNER_ACTION",
  known: readonly string[],
  selected: readonly string[],
): OfflineShelfPlan {
  if (
    trigger !== "MANUAL_OWNER_ACTION" ||
    !Array.isArray(known) ||
    !Array.isArray(selected) ||
    known.length > 1000 ||
    selected.length > 1000 ||
    [...known, ...selected].some((x) => !safeFileId(x)) ||
    new Set(known).size !== known.length ||
    new Set(selected).size !== selected.length
  )
    throw new Error("PHASE07_SHELF_MANUAL_PREVIEW_REQUIRED");
  const before = new Set(known);
  const after = new Set(selected);
  return Object.freeze({
    mode: "MANUAL_PREVIEW_ONLY",
    add: Object.freeze(selected.filter((x) => !before.has(x)).sort()),
    remove: Object.freeze(known.filter((x) => !after.has(x)).sort()),
    unchanged: Object.freeze(selected.filter((x) => before.has(x)).sort()),
  });
}
