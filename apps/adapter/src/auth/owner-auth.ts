import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { authorizeAdminMutation, type VerifiedActor } from "./policy.js";
import { createIsolatedSessionCodec } from "./session-codec.js";

const scryptAsync = (password: string, salt: Buffer): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      32,
      { N: 32_768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
      (error, key) => {
        if (error) reject(error);
        else resolve(key as Buffer);
      },
    );
  });

const SESSION_COOKIE = "grimmlink_owner_session";
const CSRF_COOKIE = "grimmlink_csrf";
const SESSION_TTL_MS = 10 * 60_000;
const LOGIN_WINDOW_MS = 60_000;
const MAX_LOGIN_ATTEMPTS = 5;
const MAX_CONCURRENT_LOGIN_CHECKS = 2;
const MAX_ACTIVE_SESSIONS = 16;
const AUTH_PREFIX = "/api/grimmlink/v2/local/auth";

type PasswordVerifier = Readonly<{ salt: Buffer; hash: Buffer }>;

export type OwnerAuthenticator = Readonly<{
  authorizeOwner: (request: FastifyRequest) => Promise<boolean>;
  verifyCsrf: (request: FastifyRequest) => Promise<boolean>;
  registerRoutes: (server: FastifyInstance) => void;
}>;

export type OwnerAuthConfig = Readonly<{
  passwordHash: string;
  sessionSigningKey: Uint8Array;
  publicOrigin: string;
  now?: () => number;
}>;

function decodeBase64Url(value: string, expectedBytes: number): Buffer | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  const decoded = Buffer.from(value, "base64url");
  return decoded.byteLength === expectedBytes && decoded.toString("base64url") === value
    ? decoded
    : null;
}

function parsePasswordVerifier(encoded: string): PasswordVerifier | null {
  const fields = encoded.split("$");
  if (
    fields.length !== 6 ||
    fields[0] !== "scrypt" ||
    fields[1] !== "32768" ||
    fields[2] !== "8" ||
    fields[3] !== "1"
  ) {
    return null;
  }
  const salt = decodeBase64Url(fields[4] ?? "", 16);
  const hash = decodeBase64Url(fields[5] ?? "", 32);
  return salt && hash ? { salt, hash } : null;
}

function validPublicOrigin(value: string): boolean {
  try {
    const parsed = new URL(value);
    return (
      parsed.origin === value &&
      parsed.pathname === "/" &&
      parsed.search === "" &&
      parsed.hash === "" &&
      parsed.username === "" &&
      parsed.password === "" &&
      (value === "http://127.0.0.1:6060" ||
        value === "http://127.0.0.1:5173" ||
        parsed.protocol === "https:")
    );
  } catch {
    return false;
  }
}

function cookieValue(request: FastifyRequest, name: string): string | null {
  const raw = request.headers.cookie;
  if (typeof raw !== "string" || raw.length > 4096) return null;
  let found: string | null = null;
  for (const item of raw.split(";")) {
    const part = item.trim();
    const equals = part.indexOf("=");
    if (equals <= 0 || part.slice(0, equals) !== name) continue;
    if (found !== null) return null;
    found = part.slice(equals + 1);
  }
  return found;
}

function exactOrigin(request: FastifyRequest, expectedOrigin: string): boolean {
  const origin = request.headers.origin;
  return typeof origin === "string" && origin === expectedOrigin;
}

function jsonContentType(request: FastifyRequest): boolean {
  const contentType = request.headers["content-type"];
  return typeof contentType === "string" && /^application\/json(?:\s*;|$)/i.test(contentType);
}

function setNoStore(reply: FastifyReply): void {
  reply.header("cache-control", "no-store").header("pragma", "no-cache");
}

function cookieHeaders(secure: boolean, session: string, csrf: string, maxAge: number): string[] {
  const secureAttribute = secure ? "; Secure" : "";
  return [
    `${SESSION_COOKIE}=${session}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secureAttribute}`,
    `${CSRF_COOKIE}=${csrf}; Path=/; SameSite=Strict; Max-Age=${maxAge}${secureAttribute}`,
  ];
}

export function createOwnerAuthenticator(config: OwnerAuthConfig): OwnerAuthenticator {
  const verifier = parsePasswordVerifier(config.passwordHash);
  const signingKey = Buffer.from(config.sessionSigningKey);
  if (
    !verifier ||
    signingKey.byteLength < 32 ||
    !validPublicOrigin(config.publicOrigin) ||
    (config.now !== undefined && typeof config.now !== "function")
  ) {
    throw new Error("OWNER_AUTH_CONFIG_INVALID");
  }

  const codec = createIsolatedSessionCodec(signingKey);
  const now = config.now ?? Date.now;
  const sessions = new Map<string, number>();
  const loginAttempts: number[] = [];
  let activePasswordChecks = 0;

  const sessionFor = (request: FastifyRequest, at: number): VerifiedActor | null => {
    const token = cookieValue(request, SESSION_COOKIE);
    if (!token) return null;
    const expiresAt = sessions.get(token);
    if (expiresAt === undefined) return null;
    if (expiresAt <= at) {
      sessions.delete(token);
      return null;
    }
    const actor = codec.verify(token, at);
    return actor?.kind === "admin" && actor.accountId === "owner" ? actor : null;
  };

  const csrfCookieMatches = (
    request: FastifyRequest,
    actor: VerifiedActor,
    at: number,
  ): boolean => {
    if (actor.kind !== "admin") return false;
    const csrf = cookieValue(request, CSRF_COOKIE);
    if (!csrf || !/^[A-Za-z0-9_-]{32,128}$/.test(csrf)) return false;
    const expected = Buffer.from(actor.csrfSha256, "hex");
    const supplied = createHash("sha256").update(csrf, "utf8").digest();
    return (
      expected.byteLength === supplied.byteLength &&
      timingSafeEqual(expected, supplied) &&
      at < actor.expiresAtMs
    );
  };

  const authorizeOwner = async (request: FastifyRequest): Promise<boolean> =>
    sessionFor(request, now()) !== null;

  const verifyCsrf = async (request: FastifyRequest): Promise<boolean> => {
    const at = now();
    const actor = sessionFor(request, at);
    if (!actor) return false;
    const csrfHeader = request.headers["x-csrf-token"];
    return (
      authorizeAdminMutation(actor, {
        method: request.method,
        origin: typeof request.headers.origin === "string" ? request.headers.origin : undefined,
        expectedOrigin: config.publicOrigin,
        csrfHeader: typeof csrfHeader === "string" ? csrfHeader : undefined,
        nowMs: at,
      }) === "ALLOW"
    );
  };

  const registerRoutes = (server: FastifyInstance): void => {
    server.get(`${AUTH_PREFIX}/session`, async (request, reply) => {
      setNoStore(reply);
      const at = now();
      const actor = sessionFor(request, at);
      const csrfToken = cookieValue(request, CSRF_COOKIE);
      if (!actor || !csrfToken || !csrfCookieMatches(request, actor, at)) {
        return reply.code(401).send({ authenticated: false });
      }
      return reply.send({ authenticated: true, csrfToken });
    });

    server.post<{ Body: unknown }>(
      `${AUTH_PREFIX}/login`,
      { bodyLimit: 2048 },
      async (request, reply) => {
        setNoStore(reply);
        const at = now();
        if (!exactOrigin(request, config.publicOrigin) || !jsonContentType(request)) {
          return reply.code(403).send({ error: "OWNER_LOGIN_DENIED" });
        }
        for (let index = loginAttempts.length - 1; index >= 0; index -= 1) {
          if (loginAttempts[index]! <= at - LOGIN_WINDOW_MS) loginAttempts.splice(index, 1);
        }
        if (loginAttempts.length >= MAX_LOGIN_ATTEMPTS) {
          const retryAfter = Math.max(
            1,
            Math.ceil((loginAttempts[0]! + LOGIN_WINDOW_MS - at) / 1000),
          );
          return reply
            .header("retry-after", String(retryAfter))
            .code(429)
            .send({ error: "OWNER_LOGIN_THROTTLED" });
        }
        const body = request.body;
        const passwordValue =
          body !== null && typeof body === "object" && !Array.isArray(body)
            ? (body as Record<string, unknown>).password
            : undefined;
        if (
          body === null ||
          typeof body !== "object" ||
          Array.isArray(body) ||
          Object.keys(body).join(",") !== "password" ||
          typeof passwordValue !== "string" ||
          Buffer.byteLength(passwordValue, "utf8") > 1024
        ) {
          loginAttempts.push(at);
          return reply.code(401).send({ error: "OWNER_CREDENTIALS_INVALID" });
        }
        if (activePasswordChecks >= MAX_CONCURRENT_LOGIN_CHECKS) {
          return reply
            .header("retry-after", "1")
            .code(429)
            .send({ error: "OWNER_LOGIN_THROTTLED" });
        }
        const password = passwordValue;
        loginAttempts.push(at);
        activePasswordChecks += 1;
        let passwordMatches = false;
        try {
          const derived = await scryptAsync(password, verifier.salt);
          passwordMatches = timingSafeEqual(derived, verifier.hash);
        } catch {
          passwordMatches = false;
        } finally {
          activePasswordChecks -= 1;
        }
        if (!passwordMatches) {
          return reply.code(401).send({ error: "OWNER_CREDENTIALS_INVALID" });
        }
        const csrfToken = randomBytes(32).toString("base64url");
        const sessionToken = codec.issueAdmin("owner", csrfToken, at, SESSION_TTL_MS);
        for (const [token, expiresAt] of sessions) {
          if (expiresAt <= at) sessions.delete(token);
        }
        while (sessions.size >= MAX_ACTIVE_SESSIONS) {
          const oldest = sessions.keys().next().value as string | undefined;
          if (oldest === undefined) break;
          sessions.delete(oldest);
        }
        sessions.set(sessionToken, at + SESSION_TTL_MS);
        reply.header(
          "set-cookie",
          cookieHeaders(
            config.publicOrigin.startsWith("https:"),
            sessionToken,
            csrfToken,
            SESSION_TTL_MS / 1000,
          ),
        );
        return reply.send({ authenticated: true, csrfToken, expiresAtMs: at + SESSION_TTL_MS });
      },
    );

    server.post(`${AUTH_PREFIX}/logout`, async (request, reply) => {
      setNoStore(reply);
      const at = now();
      const token = cookieValue(request, SESSION_COOKIE);
      const actor = sessionFor(request, at);
      if (
        !actor ||
        authorizeAdminMutation(actor, {
          method: request.method,
          origin: typeof request.headers.origin === "string" ? request.headers.origin : undefined,
          expectedOrigin: config.publicOrigin,
          csrfHeader:
            typeof request.headers["x-csrf-token"] === "string"
              ? request.headers["x-csrf-token"]
              : undefined,
          nowMs: at,
        }) !== "ALLOW"
      ) {
        return reply.code(403).send({ error: "OWNER_REQUIRED" });
      }
      if (token) sessions.delete(token);
      const secureAttribute = config.publicOrigin.startsWith("https:") ? "; Secure" : "";
      reply.header("set-cookie", [
        `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secureAttribute}`,
        `${CSRF_COOKIE}=; Path=/; SameSite=Strict; Max-Age=0${secureAttribute}`,
      ]);
      return reply.code(204).send();
    });
  };

  return Object.freeze({ authorizeOwner, verifyCsrf, registerRoutes });
}

export function createOwnerAuthenticatorFromEnvironment(
  environment: Record<string, string | undefined>,
): OwnerAuthenticator | null {
  const passwordHash = environment.GRIMMLINK_OWNER_PASSWORD_HASH?.trim() ?? "";
  const encodedKey = environment.GRIMMLINK_SESSION_SIGNING_KEY?.trim() ?? "";
  const publicOrigin = environment.GRIMMLINK_PUBLIC_ORIGIN?.trim() || "http://127.0.0.1:6060";
  if (!passwordHash && !encodedKey) {
    if (environment.GRIMMLINK_PUBLIC_ORIGIN?.trim())
      throw new Error("OWNER_AUTH_CONFIG_INCOMPLETE");
    return null;
  }
  if (!passwordHash || !encodedKey) throw new Error("OWNER_AUTH_CONFIG_INCOMPLETE");
  const sessionSigningKey = decodeBase64Url(encodedKey, 32);
  if (!sessionSigningKey) throw new Error("OWNER_AUTH_CONFIG_INVALID");
  return createOwnerAuthenticator({ passwordHash, sessionSigningKey, publicOrigin });
}
