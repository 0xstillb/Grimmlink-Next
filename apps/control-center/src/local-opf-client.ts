import { DiagnosticsClientError } from "./diagnostics-client.js";

const OPF_PATH = "/api/grimmlink/v2/local/opf/preview";
const MAX_OPF_BYTES = 1024 * 1024;
const MAX_RESPONSE_BYTES = 64 * 1024;
const CSRF = /^[A-Za-z0-9_-]{32,128}$/;
const SCALAR_KEYS = new Set([
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
]);

export type LocalOpfPreview = Readonly<{
  metadata: Readonly<Record<string, string | number>>;
  coverHref: string | null;
  action: "DRY_RUN_ONLY";
  writesAllowed: false;
  source: "OWNER_SELECTED_OPF";
}>;

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return keys.length === wanted.length && keys.every((key, index) => key === wanted[index]);
}

function safeCoverHref(value: unknown): value is string | null {
  if (value === null) return true;
  if (
    typeof value !== "string" ||
    value.length > 2048 ||
    !value ||
    value.startsWith("/") ||
    /[%?#:\\\x00-\x1f]/.test(value)
  ) {
    return false;
  }
  return value.split("/").every((segment) => segment !== "" && segment !== "." && segment !== "..");
}

async function responseText(response: Response): Promise<string> {
  if (!response.body) throw new Error("LOCAL_OPF_RESPONSE_INVALID");
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
        throw new Error("LOCAL_OPF_RESPONSE_TOO_LARGE");
      }
      text += decoder.decode(next.value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

function parsePreview(value: unknown): LocalOpfPreview {
  if (
    !record(value) ||
    !exactKeys(value, ["metadata", "coverHref", "action", "writesAllowed", "source"]) ||
    !record(value.metadata) ||
    Object.keys(value.metadata).some((key) => !SCALAR_KEYS.has(key)) ||
    Object.entries(value.metadata).some(([key, field]) =>
      key === "seriesNumber"
        ? typeof field !== "number" || !Number.isFinite(field) || field <= 0 || field > 100000
        : typeof field !== "string" || field.length > (key === "description" ? 8192 : 512),
    ) ||
    !safeCoverHref(value.coverHref) ||
    value.action !== "DRY_RUN_ONLY" ||
    value.writesAllowed !== false ||
    value.source !== "OWNER_SELECTED_OPF"
  ) {
    throw new Error("LOCAL_OPF_RESPONSE_INVALID");
  }
  return value as unknown as LocalOpfPreview;
}

export async function previewOwnerSelectedOpf(
  file: Pick<File, "name" | "size" | "arrayBuffer">,
  csrfToken: string,
  signal?: AbortSignal,
): Promise<LocalOpfPreview> {
  if (!/\.opf$/i.test(file.name) || file.size < 1 || file.size > MAX_OPF_BYTES) {
    throw new Error("LOCAL_OPF_FILE_INVALID");
  }
  if (!CSRF.test(csrfToken)) throw new Error("LOCAL_OPF_CSRF_INVALID");
  let xml: string;
  let fileBytes: ArrayBuffer;
  try {
    fileBytes = await file.arrayBuffer();
    if (fileBytes.byteLength !== file.size) throw new Error("LOCAL_OPF_FILE_INVALID");
    xml = new TextDecoder("utf-8", { fatal: true }).decode(fileBytes);
  } catch {
    throw new Error("LOCAL_OPF_UTF8_INVALID");
  }
  const body = JSON.stringify({ opfXml: xml });
  if (new TextEncoder().encode(body).byteLength > MAX_OPF_BYTES + 64 * 1024) {
    throw new Error("LOCAL_OPF_FILE_INVALID");
  }
  const response = await fetch(OPF_PATH, {
    method: "POST",
    credentials: "same-origin",
    mode: "same-origin",
    redirect: "error",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "x-csrf-token": csrfToken,
    },
    body,
    ...(signal === undefined ? {} : { signal }),
  });
  if (!response.ok) throw new DiagnosticsClientError(response.status);
  if (!response.headers.get("content-type")?.includes("application/json")) {
    throw new Error("LOCAL_OPF_RESPONSE_INVALID");
  }
  try {
    return parsePreview(JSON.parse(await responseText(response)) as unknown);
  } catch {
    throw new Error("LOCAL_OPF_RESPONSE_INVALID");
  }
}
