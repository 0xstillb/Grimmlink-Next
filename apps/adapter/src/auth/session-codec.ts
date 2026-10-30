import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { VerifiedActor } from "./policy.js";

/**
 * Phase02 isolated session cryptography for future verified identity issuers.
 * NOT a login endpoint, NOT device pairing, NOT a live Grimmory JWT verifier.
 * Never call issueAdmin/issueReader using untrusted request headers or body.
 */
type AdminSession = Readonly<{
  v: 1;
  kind: "admin";
  accountId: string;
  csrfSha256: string;
  issuedAtMs: number;
  expiresAtMs: number;
  nonce: string;
}>;
type ReaderSession = Readonly<{
  v: 1;
  kind: "reader";
  accountId: string;
  deviceId: string;
  issuedAtMs: number;
  expiresAtMs: number;
  nonce: string;
}>;
type Session = AdminSession | ReaderSession;

const validId = (id: string): boolean => /^[a-zA-Z0-9_-]{1,128}$/.test(id);
const validNonce = (nonce: string): boolean => /^[0-9a-f]{32}$/.test(nonce);
const validCsrfHash = (value: string): boolean => /^[0-9a-f]{64}$/.test(value);

export function createIsolatedSessionCodec(secret: Uint8Array) {
  if (!(secret instanceof Uint8Array) || secret.byteLength < 32) {
    throw new Error("SESSION_KEY_INVALID");
  }
  const key = Buffer.from(secret);
  const hmac = (value: string): Buffer =>
    createHmac("sha256", key)
      .update("grimmlink-next-phase02-session-v1:", "utf8")
      .update(value)
      .digest();

  const encode = (session: Session): string => {
    const body = Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
    return body + "." + hmac(body).toString("base64url");
  };

  const interval = (nowMs: number, ttlMs: number): boolean =>
    Number.isSafeInteger(nowMs) &&
    Number.isSafeInteger(ttlMs) &&
    ttlMs >= 1 &&
    ttlMs <= 3_600_000 &&
    nowMs >= 0 &&
    nowMs + ttlMs <= Number.MAX_SAFE_INTEGER;

  return {
    issueAdmin(accountId: string, csrfToken: string, nowMs: number, ttlMs = 600_000): string {
      if (
        !validId(accountId) ||
        !/^[A-Za-z0-9_-]{32,128}$/.test(csrfToken) ||
        !interval(nowMs, ttlMs)
      ) {
        throw new Error("SESSION_ISSUE_INVALID");
      }
      return encode({
        v: 1,
        kind: "admin",
        accountId,
        csrfSha256: createHash("sha256").update(csrfToken, "utf8").digest("hex"),
        issuedAtMs: nowMs,
        expiresAtMs: nowMs + ttlMs,
        nonce: randomBytes(16).toString("hex"),
      });
    },

    issueReader(accountId: string, deviceId: string, nowMs: number, ttlMs = 600_000): string {
      if (!validId(accountId) || !validId(deviceId) || !interval(nowMs, ttlMs)) {
        throw new Error("SESSION_ISSUE_INVALID");
      }
      return encode({
        v: 1,
        kind: "reader",
        accountId,
        deviceId,
        issuedAtMs: nowMs,
        expiresAtMs: nowMs + ttlMs,
        nonce: randomBytes(16).toString("hex"),
      });
    },

    verify(token: unknown, nowMs: number): VerifiedActor | null {
      if (
        typeof token !== "string" ||
        token.length < 64 ||
        token.length > 1200 ||
        !Number.isSafeInteger(nowMs) ||
        nowMs < 0
      )
        return null;
      const parts = token.split(".");
      if (
        parts.length !== 2 ||
        !parts[0] ||
        !parts[1] ||
        !/^[A-Za-z0-9_-]+$/.test(parts[0]) ||
        !/^[A-Za-z0-9_-]{43}$/.test(parts[1])
      )
        return null;
      let provided: Buffer;
      try {
        provided = Buffer.from(parts[1], "base64url");
      } catch {
        return null;
      }
      const expected = hmac(parts[0]);
      if (provided.byteLength !== expected.byteLength || !timingSafeEqual(provided, expected)) {
        return null;
      }
      let payload: unknown;
      try {
        payload = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
      } catch {
        return null;
      }
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
      const data = payload as Record<string, unknown>;
      if (
        data.v !== 1 ||
        (data.kind !== "admin" && data.kind !== "reader") ||
        typeof data.accountId !== "string" ||
        !validId(data.accountId) ||
        typeof data.nonce !== "string" ||
        !validNonce(data.nonce) ||
        typeof data.issuedAtMs !== "number" ||
        typeof data.expiresAtMs !== "number" ||
        !Number.isSafeInteger(data.issuedAtMs) ||
        !Number.isSafeInteger(data.expiresAtMs) ||
        data.issuedAtMs > nowMs ||
        data.expiresAtMs <= nowMs ||
        data.expiresAtMs - data.issuedAtMs > 3_600_000
      )
        return null;
      if (data.kind === "admin") {
        if (
          Object.keys(data).sort().join(",") !==
            "accountId,csrfSha256,expiresAtMs,issuedAtMs,kind,nonce,v" ||
          typeof data.csrfSha256 !== "string" ||
          !validCsrfHash(data.csrfSha256)
        )
          return null;
        return {
          kind: "admin",
          accountId: data.accountId,
          expiresAtMs: data.expiresAtMs,
          csrfSha256: data.csrfSha256,
        };
      }
      if (
        Object.keys(data).sort().join(",") !==
          "accountId,deviceId,expiresAtMs,issuedAtMs,kind,nonce,v" ||
        typeof data.deviceId !== "string" ||
        !validId(data.deviceId)
      )
        return null;
      return {
        kind: "reader",
        accountId: data.accountId,
        deviceId: data.deviceId,
        expiresAtMs: data.expiresAtMs,
      };
    },
  };
}
