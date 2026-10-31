/**
 * Phase02 pre-forward boundary: zero Official routes are authorized.
 * This deliberately does not normalize ambiguous targets into something "safe".
 * Source route inventories are not executable authorization proofs.
 */
export type GatewayDecision =
  | "LOCAL_READ"
  | "LOCAL_DIAGNOSTICS"
  | "LOCAL_JOBS"
  | "LOCAL_AUTH"
  | "LOCAL_OPF_PREVIEW"
  | "LOCAL_SIDECAR_PREVIEW"
  | "LOCAL_SETTINGS"
  | "LOCAL_SCREEN_STATUS"
  | "INVALID_TARGET"
  | "DENY_UPSTREAM";

const LOCAL_READ_PATHS = new Set([
  "/health",
  "/openapi.json",
  "/api/grimmlink/v2/capabilities",
  "/api/grimmlink/v2/version",
]);
const DIAGNOSTICS_PATH = /^\/api\/grimmlink\/v2\/local\/diagnostics\/adapter\/(logs|lease)$/;
const AUTH_PATH = /^\/api\/grimmlink\/v2\/local\/auth\/(session|login|logout)$/;
const SUPPORT_BUNDLE_PATH = "/api/grimmlink/v2/local/support-bundle";
const SUPPORT_BUNDLE_DOWNLOAD_PATH =
  /^\/api\/grimmlink\/v2\/local\/support-bundle\/[A-Za-z0-9_-]{22}$/;
const UPDATE_FEED_LIST_PATH = "/api/grimmlink/v2/local/updates";
const UPDATE_FEED_SOURCE_PATH = /^\/api\/grimmlink\/v2\/local\/updates\/[a-z][a-z0-9-]{0,31}$/;
const LOCAL_JOBS_PATH = "/api/grimmlink/v2/local/jobs";
const LOCAL_OPF_PREVIEW_PATH = "/api/grimmlink/v2/local/opf/preview";
const LOCAL_SIDECAR_PREVIEW_PATH = "/api/grimmlink/v2/local/sidecar/preview";
const LOCAL_SETTINGS_PATH = "/api/grimmlink/v2/local/settings/status";
const LOCAL_SCREEN_STATUS_PATH = "/api/grimmlink/v2/local/screens/status";
const LOCAL_JOBS_EVENTS_PATH = `${LOCAL_JOBS_PATH}/events`;
const LOCAL_JOB_CONTROL_PATH =
  /^\/api\/grimmlink\/v2\/local\/jobs\/[A-Za-z0-9][A-Za-z0-9:_-]{0,119}\/control$/;
const SAFE_LOG_LEVELS = new Set(["trace", "debug", "info", "warn", "error", "fatal"]);
const SAFE_LOG_CODES = new Set(["REQUEST_SUMMARY", "SQLITE_RETRY", "MIGRATION_STAGE"]);
const FORBIDDEN_HEADER_NAMES = new Set([
  "forwarded",
  "x-forwarded-host",
  "x-forwarded-proto",
  "x-forwarded-prefix",
  "x-forwarded-uri",
  "x-original-url",
  "x-original-uri",
  "x-rewrite-url",
  "x-http-method-override",
  "x-method-override",
]);

function validDiagnosticsQuery(query: string): boolean {
  if (query.length > 512 || query.includes("%") || query.includes("+") || query.includes("?")) {
    return false;
  }
  const seen = new Set<string>();
  for (const item of query.split("&")) {
    const equals = item.indexOf("=");
    if (equals <= 0 || equals !== item.lastIndexOf("=")) return false;
    const key = item.slice(0, equals);
    const value = item.slice(equals + 1);
    if (!value || seen.has(key)) return false;
    seen.add(key);
    if (key === "level") {
      if (!SAFE_LOG_LEVELS.has(value)) return false;
    } else if (key === "code") {
      if (!SAFE_LOG_CODES.has(value)) return false;
    } else if (key === "requestId") {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value))
        return false;
    } else if (key === "limit") {
      if (!/^[1-9][0-9]{0,2}$/.test(value) || Number(value) > 500) return false;
    } else {
      return false;
    }
  }
  return query.length === 0 || seen.size > 0;
}

/**
 * Accept only unambiguous origin-form request targets for allow-listed local
 * APIs; diagnostics mutations still require route-level owner and CSRF checks.
 * No URL decoding, path rewriting, or forwarded-identity trust is performed.
 * Encoded paths/queries are denied until an independently reviewed gateway
 * canonicalization contract exists. Even unambiguous Official paths are DENIED.
 */
export function classifyGatewayRequest(
  method: string,
  target: string,
  headers: Readonly<Record<string, string | string[] | undefined>>,
): GatewayDecision {
  const queryIndex = target.indexOf("?");
  const path = queryIndex === -1 ? target : target.slice(0, queryIndex);
  const query = queryIndex === -1 ? undefined : target.slice(queryIndex + 1);
  if (
    !target.startsWith("/") ||
    target.length > 4096 ||
    !path ||
    path.includes("//") ||
    path.includes("\\") ||
    path.includes("%") ||
    path.includes("#") ||
    path.includes(";") ||
    path.includes("\0") ||
    path.split("/").some((segment) => segment === "." || segment === "..") ||
    (path.length > 1 && path.endsWith("/")) ||
    (queryIndex !== -1 && (!query || query.includes("#") || query.includes(";")))
  ) {
    return "INVALID_TARGET";
  }

  for (const [rawKey, value] of Object.entries(headers)) {
    const key = rawKey.toLowerCase();
    if (
      FORBIDDEN_HEADER_NAMES.has(key) ||
      key.startsWith("x-forwarded-") ||
      key.startsWith("sec-websocket-") ||
      ["upgrade", "range", "if-range", "proxy-authorization", "transfer-encoding"].includes(key) ||
      (key === "accept" &&
        String(value).toLowerCase().includes("text/event-stream") &&
        !(method === "GET" && path === LOCAL_JOBS_EVENTS_PATH)) ||
      (key === "host" && (Array.isArray(value) || typeof value !== "string" || value.includes(",")))
    ) {
      return "INVALID_TARGET";
    }
  }

  // Fastify may auto-register HEAD for GET; it must not inherit a local allow.
  if (method === "GET" && LOCAL_READ_PATHS.has(path) && query === undefined) return "LOCAL_READ";
  const authPath = AUTH_PATH.exec(path);
  if (authPath) {
    if (query !== undefined) return "INVALID_TARGET";
    const action = authPath[1];
    if (action === "session" && method === "GET") return "LOCAL_AUTH";
    if ((action === "login" || action === "logout") && method === "POST") return "LOCAL_AUTH";
  }
  if (path === SUPPORT_BUNDLE_PATH || SUPPORT_BUNDLE_DOWNLOAD_PATH.test(path)) {
    if (query !== undefined) return "INVALID_TARGET";
    if (path === SUPPORT_BUNDLE_PATH && method === "POST") return "LOCAL_DIAGNOSTICS";
    if (SUPPORT_BUNDLE_DOWNLOAD_PATH.test(path) && method === "GET") return "LOCAL_DIAGNOSTICS";
  }
  if (path === LOCAL_OPF_PREVIEW_PATH) {
    if (query !== undefined) return "INVALID_TARGET";
    if (method === "POST") return "LOCAL_OPF_PREVIEW";
  }
  if (path === LOCAL_SIDECAR_PREVIEW_PATH) {
    if (query !== undefined) return "INVALID_TARGET";
    if (method === "POST") return "LOCAL_SIDECAR_PREVIEW";
  }
  if (path === LOCAL_SETTINGS_PATH) {
    if (query !== undefined) return "INVALID_TARGET";
    if (method === "GET") return "LOCAL_SETTINGS";
  }
  if (path === LOCAL_SCREEN_STATUS_PATH) {
    if (query !== undefined) return "INVALID_TARGET";
    if (method === "GET") return "LOCAL_SCREEN_STATUS";
  }
  if (path === UPDATE_FEED_LIST_PATH || UPDATE_FEED_SOURCE_PATH.test(path)) {
    if (query !== undefined) return "INVALID_TARGET";
    if (method === "GET") return "LOCAL_DIAGNOSTICS";
  }
  if (
    path === LOCAL_JOBS_PATH ||
    path === LOCAL_JOBS_EVENTS_PATH ||
    LOCAL_JOB_CONTROL_PATH.test(path)
  ) {
    if (query !== undefined) return "INVALID_TARGET";
    if ((path === LOCAL_JOBS_PATH || path === LOCAL_JOBS_EVENTS_PATH) && method === "GET")
      return "LOCAL_JOBS";
    if (LOCAL_JOB_CONTROL_PATH.test(path) && method === "POST") return "LOCAL_JOBS";
  }
  const diagnosticsPath = DIAGNOSTICS_PATH.exec(path);
  if (diagnosticsPath) {
    const resource = diagnosticsPath[1];
    if (resource === "logs" && method === "GET") {
      if (query === undefined || validDiagnosticsQuery(query)) return "LOCAL_DIAGNOSTICS";
      return "INVALID_TARGET";
    }
    if (query === undefined) {
      if (resource === "logs" && method === "DELETE") return "LOCAL_DIAGNOSTICS";
      if (resource === "lease" && ["GET", "PUT", "DELETE"].includes(method))
        return "LOCAL_DIAGNOSTICS";
    }
  }
  if (query !== undefined) return "INVALID_TARGET";
  // Includes registration POST, all KOReader, OPDS, App reset, Official UI
  // and every one of the 403 source route candidates.
  return "DENY_UPSTREAM";
}
