import { createHash } from "node:crypto";
import type { ScalarKey, SparseMetadata } from "./index.js";

const fields = [
  "title",
  "subtitle",
  "publisher",
  "publishedDate",
  "description",
  "seriesName",
  "seriesNumber",
  "isbn13",
  "isbn10",
  "language",
] as const satisfies readonly ScalarKey[];
const fieldSet = new Set<string>(fields);
type Locks = Readonly<Record<ScalarKey | "allMetadataLocked", boolean>>;

function validIsbn(value: string): boolean {
  if (/^\d{13}$/.test(value)) {
    const sum = [...value].slice(0, 12).reduce((n, c, i) => n + Number(c) * (i % 2 ? 3 : 1), 0);
    return (10 - (sum % 10)) % 10 === Number(value[12]);
  }
  if (/^\d{9}[\dX]$/.test(value)) {
    return (
      [...value].reduce((n, c, i) => n + (c === "X" ? 10 : Number(c)) * (10 - i), 0) % 11 === 0
    );
  }
  return false;
}

function isScalar(key: ScalarKey, value: unknown): value is string | number {
  if (key === "seriesNumber")
    return (
      typeof value === "number" &&
      Number.isFinite(value) &&
      value > 0 &&
      value <= 100000 &&
      /^\d+(?:\.\d{1,3})?$/.test(String(value))
    );
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value !== value.trim() ||
    value.length > (key === "description" ? 8192 : 512) ||
    /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value)
  )
    return false;
  if (key === "publishedDate") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(value + "T00:00:00Z");
    return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
  }
  if (key === "language") return /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(value);
  if (key === "isbn10") return value.length === 10 && validIsbn(value);
  if (key === "isbn13") return value.length === 13 && validIsbn(value);
  return true;
}

const id = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(v);
const sha = (v: unknown): v is string => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);

/**
 * Pure offline preview. The revision, locks and owner are fixture data, not
 * proof of Official entitlement, atomic CAS or permission to send a request.
 */
export function planOfflineMetadataUpdate(
  input: Readonly<{
    ownerId: string;
    bookId: string;
    bookFileId: string;
    mountId: string;
    editionSha256: string;
    opfSha256: string;
    fixtureRevision: string;
    source: Readonly<SparseMetadata>;
    current: Readonly<Partial<Record<ScalarKey, string | number | null>>>;
    locks: Locks;
    nowMs: number;
    expiresAtMs: number;
  }>,
) {
  if (
    !input ||
    !id(input.ownerId) ||
    !id(input.bookId) ||
    !id(input.bookFileId) ||
    !id(input.mountId) ||
    !id(input.fixtureRevision) ||
    !sha(input.editionSha256) ||
    !sha(input.opfSha256) ||
    !Number.isSafeInteger(input.nowMs) ||
    !Number.isSafeInteger(input.expiresAtMs) ||
    input.nowMs < 0 ||
    input.expiresAtMs <= input.nowMs ||
    input.expiresAtMs - input.nowMs > 30 * 60 * 1000
  )
    throw new Error("METADATA_FIXTURE_IDENTITY_INVALID");
  if (
    !input.source ||
    typeof input.source !== "object" ||
    Array.isArray(input.source) ||
    Object.keys(input.source).some((key) => !fieldSet.has(key))
  )
    throw new Error("METADATA_SOURCE_FIELDS_INVALID");
  if (
    !input.current ||
    typeof input.current !== "object" ||
    Array.isArray(input.current) ||
    Object.keys(input.current).some((key) => !fieldSet.has(key))
  )
    throw new Error("METADATA_CURRENT_FIELDS_INVALID");
  const expectedLockKeys = [...fields, "allMetadataLocked"].sort().join(",");
  if (
    !input.locks ||
    typeof input.locks !== "object" ||
    Array.isArray(input.locks) ||
    Object.keys(input.locks).sort().join(",") !== expectedLockKeys ||
    Object.values(input.locks).some((value) => typeof value !== "boolean")
  )
    throw new Error("METADATA_LOCKS_INCOMPLETE");

  const metadata: SparseMetadata = {};
  const changes: { field: ScalarKey; before: string | number | null; after: string | number }[] =
    [];
  const skippedLocked: ScalarKey[] = [];
  const currentValues: (string | number | null)[] = [];
  const lockValues: boolean[] = [];
  for (const key of fields) {
    const value = input.source[key];
    const current = input.current[key] ?? null;
    if (Object.hasOwn(input.source, key) && value === undefined)
      throw new Error("METADATA_SOURCE_VALUE_INVALID");
    if (value !== undefined && !isScalar(key, value))
      throw new Error("METADATA_SOURCE_VALUE_INVALID");
    if (current !== null && !isScalar(key, current))
      throw new Error("METADATA_CURRENT_VALUE_INVALID");
    currentValues.push(current);
    lockValues.push(input.locks[key]);
    if (value === undefined) continue;
    if (input.locks.allMetadataLocked || input.locks[key]) {
      skippedLocked.push(key);
      continue;
    }
    if (!Object.hasOwn(input.current, key) || input.current[key] === undefined)
      throw new Error("METADATA_CURRENT_VALUE_MISSING");
    if (current !== value) {
      Object.assign(metadata, { [key]: value });
      changes.push(Object.freeze({ field: key, before: current, after: value }));
    }
  }
  const fingerprint = createHash("sha256")
    .update(
      JSON.stringify([
        "grimmlink-offline-metadata-plan-v1",
        input.ownerId,
        input.bookId,
        input.bookFileId,
        input.mountId,
        input.editionSha256,
        input.opfSha256,
        input.fixtureRevision,
        currentValues,
        lockValues,
        input.locks.allMetadataLocked,
        metadata,
        input.expiresAtMs,
      ]),
    )
    .digest("hex");
  return Object.freeze({
    evidence: "OFFLINE_FIXTURE_ONLY" as const,
    writesAllowed: false as const,
    fingerprint,
    expiresAtMs: input.expiresAtMs,
    changes: Object.freeze(changes),
    skippedLocked: Object.freeze(skippedLocked),
    requestPreview: changes.length
      ? Object.freeze({
          method: "PUT" as const,
          path: `/api/v1/books/${input.bookId}/metadata`,
          query: Object.freeze({
            replaceMode: "REPLACE_WHEN_PROVIDED" as const,
            mergeCategories: false as const,
          }),
          body: Object.freeze({ metadata: Object.freeze(metadata) }),
        })
      : null,
  });
}
