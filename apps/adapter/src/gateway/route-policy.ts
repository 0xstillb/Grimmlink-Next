/**
 * Phase02 pre-forward boundary: zero Official routes are authorized.
 * This deliberately does not normalize ambiguous targets into something "safe".
 * Source route inventories are not executable authorization proofs.
 */
export type GatewayDecision = "LOCAL_READ" | "INVALID_TARGET" | "DENY_UPSTREAM";

const LOCAL_READ_PATHS = new Set(["/health", "/openapi.json", "/api/grimmlink/v2/capabilities"]);
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

/**
 * Accept only unambiguous origin-form request targets for local read-only APIs.
 * No URL decoding, path rewriting, or forwarded-identity trust is performed.
 * Encoded paths/queries are denied until an independently reviewed gateway
 * canonicalization contract exists. Even unambiguous Official paths are DENIED.
 */
export function classifyGatewayRequest(
  method: string,
  target: string,
  headers: Readonly<Record<string, string | string[] | undefined>>,
): GatewayDecision {
  if (
    !target.startsWith("/") ||
    target.length > 4096 ||
    target.includes("//") ||
    target.includes("\\") ||
    target.includes("%") ||
    target.includes("?") ||
    target.includes("#") ||
    target.includes(";") ||
    target.includes("\0") ||
    target.split("/").some((segment) => segment === "." || segment === "..") ||
    (target.length > 1 && target.endsWith("/"))
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
      (key === "accept" && String(value).toLowerCase().includes("text/event-stream")) ||
      (key === "host" && (Array.isArray(value) || typeof value !== "string" || value.includes(",")))
    ) {
      return "INVALID_TARGET";
    }
  }

  // Fastify may auto-register HEAD for GET; it must not inherit a local allow.
  if (method === "GET" && LOCAL_READ_PATHS.has(target)) return "LOCAL_READ";
  // Includes registration POST, all KOReader, OPDS, App reset, Official UI
  // and every one of the 403 source route candidates.
  return "DENY_UPSTREAM";
}
