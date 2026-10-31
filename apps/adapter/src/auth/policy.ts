import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Trusted principals must come from a future verified server-side session/KO
 * device authentication resolver. NEVER populate these from request headers.
 * This Phase02 module is a testable authorization contract, not a login server.
 */
export type VerifiedActor =
  | Readonly<{
      kind: "admin";
      accountId: string;
      expiresAtMs: number;
      csrfSha256: string;
    }>
  | Readonly<{
      kind: "reader";
      accountId: string;
      deviceId: string;
      expiresAtMs: number;
    }>;

export type AuthDecision =
  | "ALLOW"
  | "UNAUTHENTICATED"
  | "ROLE_DENIED"
  | "EXPIRED"
  | "INVALID_REQUEST"
  | "ORIGIN_DENIED"
  | "CSRF_DENIED"
  | "OWNER_DENIED";

const isAccountId = (s: string): boolean => /^[a-zA-Z0-9_-]{1,128}$/.test(s);
const isDeviceId = (s: string): boolean => /^[a-zA-Z0-9_-]{1,128}$/.test(s);

export function isPrivateStagingOrigin(value: string): boolean {
  try {
    const parsed = new URL(value);
    if (parsed.origin !== value || parsed.protocol !== "http:" || parsed.port !== "6062")
      return false;
    const octets = parsed.hostname.split(".").map(Number);
    if (
      octets.length !== 4 ||
      octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
    )
      return false;
    const [first, second] = octets;
    return (
      first === 10 ||
      (first === 172 && second! >= 16 && second! <= 31) ||
      (first === 192 && second === 168)
    );
  } catch {
    return false;
  }
}

function sessionStatus(actor: VerifiedActor | null, now: number): AuthDecision {
  if (actor === null) return "UNAUTHENTICATED";
  if (
    !Number.isSafeInteger(now) ||
    !Number.isSafeInteger(actor.expiresAtMs) ||
    !isAccountId(actor.accountId)
  ) {
    return "INVALID_REQUEST";
  }
  if (now >= actor.expiresAtMs) return "EXPIRED";
  if (actor.kind === "reader" && !isDeviceId(actor.deviceId)) return "INVALID_REQUEST";
  return "ALLOW";
}

export type AdminMutation = Readonly<{
  method: string;
  origin: string | undefined;
  expectedOrigin: string;
  csrfHeader: string | undefined;
  nowMs: number;
}>;

/**
 * A valid admin session is necessary but not sufficient. Compare a server-bound
 * SHA256 CSRF digest in constant time; never trust a double-submit cookie alone.
 * Control Center endpoints must verify the session before calling this function.
 */
export function authorizeAdminMutation(
  actor: VerifiedActor | null,
  request: AdminMutation,
): AuthDecision {
  const active = sessionStatus(actor, request.nowMs);
  if (active !== "ALLOW") return active;
  if (actor?.kind !== "admin") return "ROLE_DENIED";
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) return "INVALID_REQUEST";
  if (
    !/^https:\/\/[a-z0-9.-]+(?::[0-9]{1,5})?$/.test(request.expectedOrigin) &&
    request.expectedOrigin !== "http://127.0.0.1:6060" &&
    request.expectedOrigin !== "http://127.0.0.1:5173" &&
    !isPrivateStagingOrigin(request.expectedOrigin)
  ) {
    return "INVALID_REQUEST";
  }
  if (request.origin !== request.expectedOrigin) return "ORIGIN_DENIED";
  if (
    !/^[0-9a-f]{64}$/i.test(actor.csrfSha256) ||
    request.csrfHeader === undefined ||
    !/^[A-Za-z0-9_-]{32,128}$/.test(request.csrfHeader)
  ) {
    return "CSRF_DENIED";
  }
  const expected = Buffer.from(actor.csrfSha256, "hex");
  const supplied = createHash("sha256").update(request.csrfHeader).digest();
  return timingSafeEqual(expected, supplied) ? "ALLOW" : "CSRF_DENIED";
}

/**
 * Admin never implicitly acts as an individual reader. Explicit same-user
 * reader verification is required for all personal data, even for admin IDs.
 */
export function authorizeReaderResource(
  actor: VerifiedActor | null,
  accountId: string,
  nowMs: number,
): AuthDecision {
  const active = sessionStatus(actor, nowMs);
  if (active !== "ALLOW") return active;
  if (actor?.kind !== "reader") return "ROLE_DENIED";
  if (!isAccountId(accountId)) return "INVALID_REQUEST";
  return actor.accountId === accountId ? "ALLOW" : "OWNER_DENIED";
}
