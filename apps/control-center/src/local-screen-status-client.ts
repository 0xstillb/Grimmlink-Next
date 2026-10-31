import { DiagnosticsClientError } from "./diagnostics-client.js";

const STATUS_PATH = "/api/grimmlink/v2/local/screens/status";
const MAX_RESPONSE_BYTES = 8 * 1024;

export type LocalScreenStatus = Readonly<{
  source: "NO_DOMAIN_PROVIDER_CONFIGURED";
  identity: Readonly<{
    status: "UNAVAILABLE";
    reason: "TRUSTED_IDENTITY_PROVIDER_NOT_CONFIGURED";
  }>;
  reading: Readonly<{
    status: "UNAVAILABLE";
    reason: "READER_READBACK_PROVIDER_NOT_CONFIGURED";
  }>;
  opds: Readonly<{
    status: "UNAVAILABLE";
    reason: "CATALOG_PROVIDER_NOT_CONFIGURED";
  }>;
}>;

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return keys.length === wanted.length && keys.every((key, index) => key === wanted[index]);
}

async function boundedText(response: Response): Promise<string> {
  if (!response.body) throw new Error("LOCAL_SCREEN_STATUS_INVALID");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      bytes += next.value.byteLength;
      if (bytes > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new Error("LOCAL_SCREEN_STATUS_TOO_LARGE");
      }
      text += decoder.decode(next.value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

function parseStatus(value: unknown): LocalScreenStatus {
  const isDomainStatus = (item: unknown, reason: string) =>
    record(item) &&
    exactKeys(item, ["status", "reason"]) &&
    item.status === "UNAVAILABLE" &&
    item.reason === reason;
  if (
    !record(value) ||
    !exactKeys(value, ["source", "identity", "reading", "opds"]) ||
    value.source !== "NO_DOMAIN_PROVIDER_CONFIGURED" ||
    !isDomainStatus(value.identity, "TRUSTED_IDENTITY_PROVIDER_NOT_CONFIGURED") ||
    !isDomainStatus(value.reading, "READER_READBACK_PROVIDER_NOT_CONFIGURED") ||
    !isDomainStatus(value.opds, "CATALOG_PROVIDER_NOT_CONFIGURED")
  ) {
    throw new Error("LOCAL_SCREEN_STATUS_INVALID");
  }
  return value as unknown as LocalScreenStatus;
}

export async function fetchLocalScreenStatus(signal?: AbortSignal): Promise<LocalScreenStatus> {
  const response = await fetch(STATUS_PATH, {
    method: "GET",
    credentials: "same-origin",
    mode: "same-origin",
    redirect: "error",
    cache: "no-store",
    headers: { Accept: "application/json" },
    ...(signal === undefined ? {} : { signal }),
  });
  if (!response.ok) throw new DiagnosticsClientError(response.status);
  if (!response.headers.get("content-type")?.includes("application/json")) {
    throw new Error("LOCAL_SCREEN_STATUS_INVALID");
  }
  try {
    return parseStatus(JSON.parse(await boundedText(response)) as unknown);
  } catch {
    throw new Error("LOCAL_SCREEN_STATUS_INVALID");
  }
}
