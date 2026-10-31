import { DiagnosticsClientError } from "./diagnostics-client.js";

const READING_PATH = "/api/grimmlink/v2/local/reading";
const ID = /^[A-Za-z0-9_-]{1,128}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const MAX_RESPONSE_BYTES = 1024 * 1024;

export type LocalReadingPosition =
  | Readonly<{
      kind: "EPUB_EXACT";
      nativePosition: string;
      evidence: "OFFLINE_SYNTHETIC_FIXTURE_ONLY" | "EPUB_DOM_ROUNDTRIP_ONLY";
    }>
  | Readonly<{
      kind: "PDF_PAGE";
      pageNumber: number;
      pageCount: number;
      evidence: "OFFLINE_FIXTURE_PAGE_COUNT_ONLY";
    }>;

export type LocalReadingItem = Readonly<{
  bookId: string;
  bookFileId: string;
  format: "EPUB" | "PDF";
  editionSha256: string;
  revision: number;
  status: "NO_POSITION" | "LOCAL_PREVIEW_ONLY";
  position: LocalReadingPosition | null;
  percentage: null;
}>;

export type LocalReadingSnapshot = Readonly<{
  source: "LOCAL_SQLITE_PHASE06_OFFLINE";
  items: readonly LocalReadingItem[];
  truncated: boolean;
  readerConnection: "NOT_CONNECTED";
  officialWrites: "OFF";
}>;

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}

async function boundedText(response: Response): Promise<string> {
  if (!response.body) throw new Error("LOCAL_READING_RESPONSE_INVALID");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let body = "";
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      bytes += next.value.byteLength;
      if (bytes > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new Error("LOCAL_READING_RESPONSE_TOO_LARGE");
      }
      body += decoder.decode(next.value, { stream: true });
    }
    return body + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

function safeInteger(
  value: unknown,
  minimum: number,
  maximum = Number.MAX_SAFE_INTEGER,
): value is number {
  return (
    typeof value === "number" && Number.isSafeInteger(value) && value >= minimum && value <= maximum
  );
}

function parsePosition(value: unknown, format: "EPUB" | "PDF"): LocalReadingPosition | null {
  if (value === null) return null;
  if (!record(value)) throw new Error("LOCAL_READING_RESPONSE_INVALID");
  if (
    format === "EPUB" &&
    exactKeys(value, ["kind", "nativePosition", "evidence"]) &&
    value.kind === "EPUB_EXACT" &&
    typeof value.nativePosition === "string" &&
    value.nativePosition.length > 3 &&
    value.nativePosition.length <= 2048 &&
    !/[\x00-\x20\x7f<>%\\]/.test(value.nativePosition) &&
    (value.evidence === "OFFLINE_SYNTHETIC_FIXTURE_ONLY" ||
      value.evidence === "EPUB_DOM_ROUNDTRIP_ONLY")
  ) {
    return value as unknown as LocalReadingPosition;
  }
  if (
    format === "PDF" &&
    exactKeys(value, ["kind", "pageNumber", "pageCount", "evidence"]) &&
    value.kind === "PDF_PAGE" &&
    safeInteger(value.pageNumber, 1, 100000) &&
    safeInteger(value.pageCount, 1, 100000) &&
    value.pageNumber <= value.pageCount &&
    value.evidence === "OFFLINE_FIXTURE_PAGE_COUNT_ONLY"
  ) {
    return value as unknown as LocalReadingPosition;
  }
  throw new Error("LOCAL_READING_RESPONSE_INVALID");
}

function parseItem(value: unknown): LocalReadingItem {
  if (
    !record(value) ||
    !exactKeys(value, [
      "bookId",
      "bookFileId",
      "format",
      "editionSha256",
      "revision",
      "status",
      "position",
      "percentage",
    ]) ||
    typeof value.bookId !== "string" ||
    !ID.test(value.bookId) ||
    typeof value.bookFileId !== "string" ||
    !ID.test(value.bookFileId) ||
    (value.format !== "EPUB" && value.format !== "PDF") ||
    typeof value.editionSha256 !== "string" ||
    !SHA256.test(value.editionSha256) ||
    !safeInteger(value.revision, 0) ||
    (value.status !== "NO_POSITION" && value.status !== "LOCAL_PREVIEW_ONLY") ||
    value.percentage !== null
  ) {
    throw new Error("LOCAL_READING_RESPONSE_INVALID");
  }
  const position = parsePosition(value.position, value.format);
  if (
    (value.status === "NO_POSITION" && (value.revision !== 0 || position !== null)) ||
    (value.status === "LOCAL_PREVIEW_ONLY" && (value.revision < 1 || position === null))
  ) {
    throw new Error("LOCAL_READING_RESPONSE_INVALID");
  }
  return { ...value, position } as unknown as LocalReadingItem;
}

function parseSnapshot(value: unknown): LocalReadingSnapshot {
  if (
    !record(value) ||
    !exactKeys(value, ["source", "items", "truncated", "readerConnection", "officialWrites"]) ||
    value.source !== "LOCAL_SQLITE_PHASE06_OFFLINE" ||
    !Array.isArray(value.items) ||
    value.items.length > 100 ||
    typeof value.truncated !== "boolean" ||
    value.readerConnection !== "NOT_CONNECTED" ||
    value.officialWrites !== "OFF"
  ) {
    throw new Error("LOCAL_READING_RESPONSE_INVALID");
  }
  const items = value.items.map(parseItem);
  if (new Set(items.map((item) => item.bookFileId)).size !== items.length)
    throw new Error("LOCAL_READING_RESPONSE_INVALID");
  return {
    source: "LOCAL_SQLITE_PHASE06_OFFLINE",
    items,
    truncated: value.truncated,
    readerConnection: "NOT_CONNECTED",
    officialWrites: "OFF",
  };
}

export async function fetchLocalReading(signal?: AbortSignal): Promise<LocalReadingSnapshot> {
  const response = await fetch(READING_PATH, {
    method: "GET",
    credentials: "same-origin",
    mode: "same-origin",
    redirect: "error",
    cache: "no-store",
    headers: { Accept: "application/json" },
    ...(signal === undefined ? {} : { signal }),
  });
  if (!response.ok) throw new DiagnosticsClientError(response.status);
  if (!response.headers.get("content-type")?.includes("application/json"))
    throw new Error("LOCAL_READING_RESPONSE_INVALID");
  try {
    return parseSnapshot(JSON.parse(await boundedText(response)) as unknown);
  } catch {
    throw new Error("LOCAL_READING_RESPONSE_INVALID");
  }
}
