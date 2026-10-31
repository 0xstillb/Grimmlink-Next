export type DiagnosticCode = "REQUEST_SUMMARY" | "SQLITE_RETRY" | "MIGRATION_STAGE";
export type DiagnosticLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

export type SafeDiagnosticLog = Readonly<{
  level: number;
  time: number;
  code: DiagnosticCode;
  count?: number;
  request?: Readonly<{ id: string; method: string }>;
}>;

export type DiagnosticLease = Readonly<{
  level: "info" | "debug" | "trace";
  expiresAt: number | null;
}>;

export type DiagnosticFilter = Readonly<{
  level?: DiagnosticLevel;
  code?: DiagnosticCode;
  requestId?: string;
  limit?: number;
}>;

export class DiagnosticsClientError extends Error {
  constructor(readonly status: number) {
    super("DIAGNOSTICS_REQUEST_FAILED");
    this.name = "DiagnosticsClientError";
  }
}

export type OwnerSession = Readonly<{ authenticated: boolean; csrfToken: string | null }>;
export type OwnerLogin = Readonly<{ csrfToken: string; expiresAtMs: number }>;
export type SupportBundleReceipt = Readonly<{
  bundleId: string;
  checksumSha256: string;
  expiresAt: string;
}>;
export type ServerSupportBundle = Readonly<{
  schema: "grimmlink.phase08.support-bundle.v1";
  createdAt: string;
  expiresAt: string;
  checksum: Readonly<{ algorithm: "SHA-256"; covers: "report-json-v1"; value: string }>;
  report: Readonly<{
    schema: "grimmlink.phase08.support-report.v1";
    generatedAt: string;
    scope: "SAFE_LOCAL_PROCESS_STATUS";
    status: Readonly<{
      mode: "MOCK_ONLY";
      officialConnected: false;
      gatewayForwarding: "DENY_ALL";
      protectedWrites: "OFF";
    }>;
    diagnostics: readonly string[];
  }>;
}>;

const MODULE = "adapter";
const MAX_RESPONSE_BYTES = 256 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LEVEL_NUMBERS = new Set([10, 20, 30, 40, 50, 60]);
const LEVELS = new Set<DiagnosticLevel>(["trace", "debug", "info", "warn", "error", "fatal"]);
const CODES = new Set<DiagnosticCode>(["REQUEST_SUMMARY", "SQLITE_RETRY", "MIGRATION_STAGE"]);
const METHODS = new Set(["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]);

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}

function validCsrfToken(value: string): boolean {
  return /^[A-Za-z0-9_-]{32,128}$/.test(value);
}

export function readDiagnosticsCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const token = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content;
  return token && validCsrfToken(token) ? token : null;
}

export function parseSafeDiagnosticLog(line: unknown): SafeDiagnosticLog {
  if (typeof line !== "string" || line.length > 16_384) throw new Error("DIAGNOSTIC_LINE_INVALID");
  let parsed: unknown;
  try {
    parsed = JSON.parse(line) as unknown;
  } catch {
    throw new Error("DIAGNOSTIC_LINE_INVALID");
  }
  if (
    !record(parsed) ||
    !hasOnlyKeys(parsed, [
      "level",
      "time",
      "pid",
      "hostname",
      "name",
      "module",
      "msg",
      "code",
      "count",
      "req",
      "redacted",
    ]) ||
    parsed.module !== MODULE ||
    parsed.msg !== "SCOPED_DIAGNOSTIC" ||
    typeof parsed.level !== "number" ||
    !LEVEL_NUMBERS.has(parsed.level) ||
    typeof parsed.time !== "number" ||
    !Number.isSafeInteger(parsed.time) ||
    typeof parsed.code !== "string" ||
    !CODES.has(parsed.code as DiagnosticCode) ||
    (parsed.count !== undefined &&
      (typeof parsed.count !== "number" ||
        !Number.isSafeInteger(parsed.count) ||
        parsed.count < 0)) ||
    (parsed.redacted !== undefined && parsed.redacted !== "[REDACTED]")
  ) {
    throw new Error("DIAGNOSTIC_LINE_INVALID");
  }

  let request: SafeDiagnosticLog["request"];
  if (parsed.req !== undefined) {
    if (
      !record(parsed.req) ||
      !hasOnlyKeys(parsed.req, ["id", "method"]) ||
      typeof parsed.req.id !== "string" ||
      !UUID.test(parsed.req.id) ||
      typeof parsed.req.method !== "string" ||
      !METHODS.has(parsed.req.method)
    ) {
      throw new Error("DIAGNOSTIC_LINE_INVALID");
    }
    request = { id: parsed.req.id, method: parsed.req.method };
  }

  return {
    level: parsed.level,
    time: parsed.time,
    code: parsed.code as DiagnosticCode,
    ...(parsed.count === undefined ? {} : { count: parsed.count as number }),
    ...(request === undefined ? {} : { request }),
  };
}

async function boundedText(response: Response): Promise<string> {
  const size = Number(response.headers.get("content-length"));
  if (Number.isFinite(size) && size > MAX_RESPONSE_BYTES)
    throw new Error("DIAGNOSTICS_RESPONSE_TOO_LARGE");
  if (!response.body) throw new Error("DIAGNOSTICS_RESPONSE_EMPTY");
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let received = 0;
  let text = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new Error("DIAGNOSTICS_RESPONSE_TOO_LARGE");
      }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

async function requestJson(
  path: string,
  options: { method?: string; body?: string; csrfToken?: string; signal?: AbortSignal } = {},
): Promise<unknown> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.csrfToken !== undefined) {
    if (!validCsrfToken(options.csrfToken)) throw new Error("DIAGNOSTICS_CSRF_TOKEN_INVALID");
    headers["x-csrf-token"] = options.csrfToken;
  }
  const response = await fetch(path, {
    method: options.method ?? "GET",
    credentials: "same-origin",
    mode: "same-origin",
    redirect: "error",
    cache: "no-store",
    headers,
    ...(options.body === undefined ? {} : { body: options.body }),
    ...(options.signal === undefined ? {} : { signal: options.signal }),
  });
  if (!response.ok) throw new DiagnosticsClientError(response.status);
  if (!response.headers.get("content-type")?.includes("application/json")) {
    throw new Error("DIAGNOSTICS_RESPONSE_INVALID");
  }
  try {
    return JSON.parse(await boundedText(response)) as unknown;
  } catch {
    throw new Error("DIAGNOSTICS_RESPONSE_INVALID");
  }
}

function parseOwnerSession(value: unknown): OwnerSession {
  if (
    !record(value) ||
    !hasOnlyKeys(value, ["authenticated", "csrfToken"]) ||
    typeof value.authenticated !== "boolean" ||
    (value.csrfToken !== null &&
      (typeof value.csrfToken !== "string" || !validCsrfToken(value.csrfToken))) ||
    (value.authenticated && typeof value.csrfToken !== "string") ||
    (!value.authenticated && value.csrfToken !== null)
  ) {
    throw new Error("OWNER_SESSION_RESPONSE_INVALID");
  }
  return { authenticated: value.authenticated, csrfToken: value.csrfToken as string | null };
}

export async function fetchOwnerSession(signal?: AbortSignal): Promise<OwnerSession> {
  try {
    return parseOwnerSession(
      await requestJson("/api/grimmlink/v2/local/auth/session", {
        ...(signal === undefined ? {} : { signal }),
      }),
    );
  } catch (error) {
    if (error instanceof DiagnosticsClientError && error.status === 401) {
      return { authenticated: false, csrfToken: null };
    }
    throw error;
  }
}

export async function loginOwner(password: string): Promise<OwnerLogin> {
  if (typeof password !== "string" || password.length === 0 || password.length > 1024) {
    throw new Error("OWNER_CREDENTIALS_INVALID");
  }
  const value = await requestJson("/api/grimmlink/v2/local/auth/login", {
    method: "POST",
    body: JSON.stringify({ password }),
  });
  if (
    !record(value) ||
    !hasOnlyKeys(value, ["authenticated", "csrfToken", "expiresAtMs"]) ||
    value.authenticated !== true ||
    typeof value.csrfToken !== "string" ||
    !validCsrfToken(value.csrfToken) ||
    typeof value.expiresAtMs !== "number" ||
    !Number.isSafeInteger(value.expiresAtMs)
  ) {
    throw new Error("OWNER_LOGIN_RESPONSE_INVALID");
  }
  return { csrfToken: value.csrfToken, expiresAtMs: value.expiresAtMs };
}

export async function logoutOwner(csrfToken: string): Promise<void> {
  if (!validCsrfToken(csrfToken)) throw new Error("DIAGNOSTICS_CSRF_TOKEN_INVALID");
  const response = await fetch("/api/grimmlink/v2/local/auth/logout", {
    method: "POST",
    credentials: "same-origin",
    mode: "same-origin",
    redirect: "error",
    cache: "no-store",
    headers: { Accept: "application/json", "x-csrf-token": csrfToken },
  });
  if (!response.ok) throw new DiagnosticsClientError(response.status);
  if (response.status !== 204) throw new Error("OWNER_LOGOUT_RESPONSE_INVALID");
}

const SUPPORT_BUNDLE_PATH = "/api/grimmlink/v2/local/support-bundle";
const SUPPORT_BUNDLE_ID = /^[A-Za-z0-9_-]{22}$/;
const SHA256 = /^[0-9a-f]{64}$/;

function canonicalIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString() === value;
}

export async function createServerSupportBundle(csrfToken: string): Promise<SupportBundleReceipt> {
  const value = await requestJson(SUPPORT_BUNDLE_PATH, { method: "POST", csrfToken });
  if (
    !record(value) ||
    !hasOnlyKeys(value, ["bundleId", "checksumSha256", "expiresAt"]) ||
    typeof value.bundleId !== "string" ||
    !SUPPORT_BUNDLE_ID.test(value.bundleId) ||
    typeof value.checksumSha256 !== "string" ||
    !SHA256.test(value.checksumSha256) ||
    !canonicalIsoTimestamp(value.expiresAt)
  ) {
    throw new Error("SUPPORT_BUNDLE_RECEIPT_INVALID");
  }
  return {
    bundleId: value.bundleId,
    checksumSha256: value.checksumSha256,
    expiresAt: value.expiresAt,
  };
}

export async function fetchServerSupportBundle(bundleId: string): Promise<ServerSupportBundle> {
  if (!SUPPORT_BUNDLE_ID.test(bundleId)) throw new Error("SUPPORT_BUNDLE_ID_INVALID");
  const value = await requestJson(`${SUPPORT_BUNDLE_PATH}/${bundleId}`);
  if (
    !record(value) ||
    !hasOnlyKeys(value, ["schema", "createdAt", "expiresAt", "checksum", "report"]) ||
    value.schema !== "grimmlink.phase08.support-bundle.v1" ||
    !canonicalIsoTimestamp(value.createdAt) ||
    !canonicalIsoTimestamp(value.expiresAt) ||
    Date.parse(value.expiresAt) - Date.parse(value.createdAt) !== 60 * 60_000 ||
    !record(value.checksum) ||
    !hasOnlyKeys(value.checksum, ["algorithm", "covers", "value"]) ||
    value.checksum.algorithm !== "SHA-256" ||
    value.checksum.covers !== "report-json-v1" ||
    typeof value.checksum.value !== "string" ||
    !SHA256.test(value.checksum.value) ||
    !record(value.report) ||
    !hasOnlyKeys(value.report, ["schema", "generatedAt", "scope", "status", "diagnostics"]) ||
    value.report.schema !== "grimmlink.phase08.support-report.v1" ||
    value.report.generatedAt !== value.createdAt ||
    value.report.scope !== "SAFE_LOCAL_PROCESS_STATUS" ||
    !record(value.report.status) ||
    !hasOnlyKeys(value.report.status, [
      "mode",
      "officialConnected",
      "gatewayForwarding",
      "protectedWrites",
    ]) ||
    value.report.status.mode !== "MOCK_ONLY" ||
    value.report.status.officialConnected !== false ||
    value.report.status.gatewayForwarding !== "DENY_ALL" ||
    value.report.status.protectedWrites !== "OFF" ||
    !Array.isArray(value.report.diagnostics) ||
    value.report.diagnostics.length > 100 ||
    !value.report.diagnostics.every((line) => {
      try {
        parseSafeDiagnosticLog(line);
        return true;
      } catch {
        return false;
      }
    })
  ) {
    throw new Error("SUPPORT_BUNDLE_RESPONSE_INVALID");
  }
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(value.report)),
  );
  const actualChecksum = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  if (actualChecksum !== value.checksum.value) throw new Error("SUPPORT_BUNDLE_CHECKSUM_INVALID");
  return value as unknown as ServerSupportBundle;
}

function parseLogs(value: unknown): readonly SafeDiagnosticLog[] {
  if (
    !record(value) ||
    !hasOnlyKeys(value, ["module", "lines"]) ||
    value.module !== MODULE ||
    !Array.isArray(value.lines) ||
    value.lines.length > 500
  ) {
    throw new Error("DIAGNOSTICS_RESPONSE_INVALID");
  }
  return value.lines.map(parseSafeDiagnosticLog);
}

function parseLease(value: unknown): DiagnosticLease {
  if (
    !record(value) ||
    !hasOnlyKeys(value, ["module", "level", "expiresAt"]) ||
    value.module !== MODULE ||
    !["info", "debug", "trace"].includes(String(value.level)) ||
    (value.expiresAt !== null &&
      (typeof value.expiresAt !== "number" || !Number.isSafeInteger(value.expiresAt)))
  ) {
    throw new Error("DIAGNOSTICS_RESPONSE_INVALID");
  }
  if ((value.level === "info") !== (value.expiresAt === null)) {
    throw new Error("DIAGNOSTICS_RESPONSE_INVALID");
  }
  return {
    level: value.level as DiagnosticLease["level"],
    expiresAt: value.expiresAt as number | null,
  };
}

export async function fetchDiagnosticLogs(
  filter: DiagnosticFilter = {},
  signal?: AbortSignal,
): Promise<readonly SafeDiagnosticLog[]> {
  const query = new URLSearchParams();
  if (filter.level !== undefined) {
    if (!LEVELS.has(filter.level)) throw new Error("DIAGNOSTICS_FILTER_INVALID");
    query.set("level", filter.level);
  }
  if (filter.code !== undefined) {
    if (!CODES.has(filter.code)) throw new Error("DIAGNOSTICS_FILTER_INVALID");
    query.set("code", filter.code);
  }
  if (filter.requestId !== undefined) {
    if (!UUID.test(filter.requestId)) throw new Error("DIAGNOSTICS_FILTER_INVALID");
    query.set("requestId", filter.requestId);
  }
  if (filter.limit !== undefined) {
    if (!Number.isSafeInteger(filter.limit) || filter.limit < 1 || filter.limit > 500) {
      throw new Error("DIAGNOSTICS_FILTER_INVALID");
    }
    query.set("limit", String(filter.limit));
  }
  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  return parseLogs(
    await requestJson(`/api/grimmlink/v2/local/diagnostics/adapter/logs${suffix}`, {
      ...(signal === undefined ? {} : { signal }),
    }),
  );
}

export async function fetchDiagnosticLease(signal?: AbortSignal): Promise<DiagnosticLease> {
  return parseLease(
    await requestJson("/api/grimmlink/v2/local/diagnostics/adapter/lease", {
      ...(signal === undefined ? {} : { signal }),
    }),
  );
}

export async function enableDiagnosticLease(
  level: "debug" | "trace",
  csrfToken: string,
): Promise<DiagnosticLease> {
  if (level !== "debug" && level !== "trace") throw new Error("DIAGNOSTICS_LEASE_INVALID");
  const durationMs = level === "debug" ? 30 * 60_000 : 5 * 60_000;
  return parseLease(
    await requestJson("/api/grimmlink/v2/local/diagnostics/adapter/lease", {
      method: "PUT",
      body: JSON.stringify({ level, durationMs }),
      csrfToken,
    }),
  );
}

export async function disableDiagnosticLease(csrfToken: string): Promise<DiagnosticLease> {
  return parseLease(
    await requestJson("/api/grimmlink/v2/local/diagnostics/adapter/lease", {
      method: "DELETE",
      csrfToken,
    }),
  );
}

export async function clearDiagnosticLogs(csrfToken: string): Promise<void> {
  const result = await requestJson("/api/grimmlink/v2/local/diagnostics/adapter/logs", {
    method: "DELETE",
    csrfToken,
  });
  if (!record(result) || result.module !== MODULE || result.cleared !== true) {
    throw new Error("DIAGNOSTICS_RESPONSE_INVALID");
  }
}
