import { DiagnosticsClientError } from "./diagnostics-client.js";

const SIDECAR_PATH = "/api/grimmlink/v2/local/sidecar/preview";
const MAX_SIDECAR_BYTES = 1024 * 1024;
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

export type LocalSidecarPreview = Readonly<{
  metadata: Readonly<Record<string, string | number>>;
  action: "PREVIEW_ONLY";
  writesAllowed: false;
  source: "OWNER_SELECTED_SIDECAR";
  importsEnabled: false;
  adjacentWriteEnabled: false;
}>;

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return keys.length === wanted.length && keys.every((key, index) => key === wanted[index]);
}

async function responseText(response: Response): Promise<string> {
  if (!response.body) throw new Error("LOCAL_SIDECAR_RESPONSE_INVALID");
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
        throw new Error("LOCAL_SIDECAR_RESPONSE_TOO_LARGE");
      }
      text += decoder.decode(next.value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

function parsePreview(value: unknown): LocalSidecarPreview {
  if (
    !record(value) ||
    !exactKeys(value, [
      "metadata",
      "action",
      "writesAllowed",
      "source",
      "importsEnabled",
      "adjacentWriteEnabled",
    ]) ||
    !record(value.metadata) ||
    Object.keys(value.metadata).some((key) => !SCALAR_KEYS.has(key)) ||
    Object.entries(value.metadata).some(([key, field]) =>
      key === "seriesNumber"
        ? typeof field !== "number" || !Number.isFinite(field) || field <= 0 || field > 100000
        : typeof field !== "string" ||
          field.trim() !== field ||
          field.length === 0 ||
          field.length > (key === "description" ? 8192 : 512) ||
          /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(field),
    ) ||
    value.action !== "PREVIEW_ONLY" ||
    value.writesAllowed !== false ||
    value.source !== "OWNER_SELECTED_SIDECAR" ||
    value.importsEnabled !== false ||
    value.adjacentWriteEnabled !== false
  ) {
    throw new Error("LOCAL_SIDECAR_RESPONSE_INVALID");
  }
  return value as unknown as LocalSidecarPreview;
}

export async function previewOwnerSelectedSidecar(
  file: Pick<File, "name" | "size" | "arrayBuffer">,
  csrfToken: string,
  signal?: AbortSignal,
): Promise<LocalSidecarPreview> {
  if (!/\.json$/i.test(file.name) || file.size < 2 || file.size > MAX_SIDECAR_BYTES) {
    throw new Error("LOCAL_SIDECAR_FILE_INVALID");
  }
  if (!CSRF.test(csrfToken)) throw new Error("LOCAL_SIDECAR_CSRF_INVALID");
  let json: string;
  try {
    const bytes = await file.arrayBuffer();
    if (bytes.byteLength !== file.size) throw new Error("LOCAL_SIDECAR_FILE_INVALID");
    json = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error("LOCAL_SIDECAR_UTF8_INVALID");
  }
  const body = JSON.stringify({ sidecarJson: json });
  if (new TextEncoder().encode(body).byteLength > MAX_SIDECAR_BYTES + 64 * 1024) {
    throw new Error("LOCAL_SIDECAR_FILE_INVALID");
  }
  const response = await fetch(SIDECAR_PATH, {
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
    throw new Error("LOCAL_SIDECAR_RESPONSE_INVALID");
  }
  try {
    return parsePreview(JSON.parse(await responseText(response)) as unknown);
  } catch {
    throw new Error("LOCAL_SIDECAR_RESPONSE_INVALID");
  }
}
