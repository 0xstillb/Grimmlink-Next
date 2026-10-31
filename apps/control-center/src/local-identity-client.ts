import { DiagnosticsClientError } from "./diagnostics-client.js";

const IDENTITY_PATH = "/api/grimmlink/v2/local/identity";
const FILE_ID = /^[A-Za-z0-9_-]{1,128}$/;
const KO_DOCUMENT_MD5 = /^[a-f0-9]{32}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const MAX_RESPONSE_BYTES = 256 * 1024;

export type LocalIdentityRegistration = Readonly<{
  koDocumentMd5: string;
  bookFileId: string;
  editionSha256: string;
  localWriterMode: "DISABLED" | "MOCK_MANAGED";
  revision: number;
  identityEvidence: "LOCAL_REGISTRATION_ONLY";
}>;

export type LocalIdentitySnapshot = Readonly<{
  source: "LOCAL_SQLITE_PHASE05_OFFLINE";
  officialOwnership: "NOT_VERIFIED";
  items: readonly LocalIdentityRegistration[];
  truncated: boolean;
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
  if (!response.body) throw new Error("LOCAL_IDENTITY_RESPONSE_INVALID");
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
        throw new Error("LOCAL_IDENTITY_RESPONSE_TOO_LARGE");
      }
      body += decoder.decode(next.value, { stream: true });
    }
    return body + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

function parseIdentity(value: unknown): LocalIdentityRegistration {
  if (
    !record(value) ||
    !exactKeys(value, [
      "koDocumentMd5",
      "bookFileId",
      "editionSha256",
      "localWriterMode",
      "revision",
      "identityEvidence",
    ]) ||
    typeof value.koDocumentMd5 !== "string" ||
    !KO_DOCUMENT_MD5.test(value.koDocumentMd5) ||
    typeof value.bookFileId !== "string" ||
    !FILE_ID.test(value.bookFileId) ||
    typeof value.editionSha256 !== "string" ||
    !SHA256.test(value.editionSha256) ||
    (value.localWriterMode !== "DISABLED" && value.localWriterMode !== "MOCK_MANAGED") ||
    typeof value.revision !== "number" ||
    !Number.isSafeInteger(value.revision) ||
    value.revision < 0 ||
    value.identityEvidence !== "LOCAL_REGISTRATION_ONLY"
  ) {
    throw new Error("LOCAL_IDENTITY_RESPONSE_INVALID");
  }
  return value as unknown as LocalIdentityRegistration;
}

function parseSnapshot(value: unknown): LocalIdentitySnapshot {
  if (
    !record(value) ||
    !exactKeys(value, ["source", "officialOwnership", "items", "truncated", "officialWrites"]) ||
    value.source !== "LOCAL_SQLITE_PHASE05_OFFLINE" ||
    value.officialOwnership !== "NOT_VERIFIED" ||
    !Array.isArray(value.items) ||
    value.items.length > 100 ||
    typeof value.truncated !== "boolean" ||
    value.officialWrites !== "OFF"
  ) {
    throw new Error("LOCAL_IDENTITY_RESPONSE_INVALID");
  }
  const items = value.items.map(parseIdentity);
  if (new Set(items.map((item) => item.koDocumentMd5)).size !== items.length)
    throw new Error("LOCAL_IDENTITY_RESPONSE_INVALID");
  return {
    source: "LOCAL_SQLITE_PHASE05_OFFLINE",
    officialOwnership: "NOT_VERIFIED",
    items,
    truncated: value.truncated,
    officialWrites: "OFF",
  };
}

export async function fetchLocalIdentity(signal?: AbortSignal): Promise<LocalIdentitySnapshot> {
  const response = await fetch(IDENTITY_PATH, {
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
    throw new Error("LOCAL_IDENTITY_RESPONSE_INVALID");
  try {
    return parseSnapshot(JSON.parse(await boundedText(response)) as unknown);
  } catch {
    throw new Error("LOCAL_IDENTITY_RESPONSE_INVALID");
  }
}
