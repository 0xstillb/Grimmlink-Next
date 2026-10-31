import { scryptSync } from "node:crypto";
import Fastify from "fastify";
import { beforeAll, describe, expect, it } from "vitest";
import type { FastifyRequest } from "fastify";
import { createOwnerAuthenticator, createOwnerAuthenticatorFromEnvironment } from "./owner-auth.js";

const PASSWORD = "test-owner-password-with-length";
const ORIGIN = "http://127.0.0.1:6060";
const SALT = Buffer.from("owner-auth-test1");
const KEY = Buffer.alloc(32, 0x42);
const HASH = `scrypt$32768$8$1$${SALT.toString("base64url")}$${scryptSync(PASSWORD, SALT, 32, {
  N: 32_768,
  r: 8,
  p: 1,
  maxmem: 64 * 1024 * 1024,
}).toString("base64url")}`;
const AUTH_PREFIX = "/api/grimmlink/v2/local/auth";

function cookiesFrom(response: { headers: Record<string, unknown> }): string {
  const setCookie = response.headers["set-cookie"];
  const lines = Array.isArray(setCookie) ? setCookie : [setCookie];
  return lines
    .filter((line): line is string => typeof line === "string")
    .map((line) => line.split(";", 1)[0]!)
    .join("; ");
}

function makeAuth(now: () => number = () => Date.now()) {
  return createOwnerAuthenticator({
    passwordHash: HASH,
    sessionSigningKey: KEY,
    publicOrigin: ORIGIN,
    now,
  });
}

describe("single-owner local session routes", () => {
  let auth: ReturnType<typeof makeAuth>;
  let server: ReturnType<typeof Fastify>;

  beforeAll(async () => {
    auth = makeAuth();
    server = Fastify({ logger: false });
    auth.registerRoutes(server);
    await server.ready();
  });

  it("keeps the session route unauthenticated until a valid owner login", async () => {
    const response = await server.inject({ method: "GET", url: `${AUTH_PREFIX}/session` });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ authenticated: false });
    expect(response.headers["cache-control"]).toBe("no-store");
  });

  it("requires exact same-origin JSON and a valid password to establish the owner session", async () => {
    const missingOrigin = await server.inject({
      method: "POST",
      url: `${AUTH_PREFIX}/login`,
      payload: { password: PASSWORD },
    });
    expect(missingOrigin.statusCode).toBe(403);

    const invalid = await server.inject({
      method: "POST",
      url: `${AUTH_PREFIX}/login`,
      headers: { origin: ORIGIN, "content-type": "application/json" },
      payload: { password: `${PASSWORD}-wrong` },
    });
    expect(invalid.statusCode).toBe(401);
    expect(invalid.json()).toEqual({ error: "OWNER_CREDENTIALS_INVALID" });

    const login = await server.inject({
      method: "POST",
      url: `${AUTH_PREFIX}/login`,
      headers: { origin: ORIGIN, "content-type": "application/json" },
      payload: { password: PASSWORD },
    });
    expect(login.statusCode).toBe(200);
    expect(login.headers["set-cookie"]).toEqual(expect.any(Array));
    const body = login.json() as { authenticated: boolean; csrfToken: string; expiresAtMs: number };
    expect(body.authenticated).toBe(true);
    expect(body.csrfToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const cookie = cookiesFrom(login);

    const session = await server.inject({
      method: "GET",
      url: `${AUTH_PREFIX}/session`,
      headers: { cookie },
    });
    expect(session.statusCode).toBe(200);
    expect(session.json()).toEqual({ authenticated: true, csrfToken: body.csrfToken });

    const fakeRequest = {
      method: "DELETE",
      headers: { cookie, origin: ORIGIN, "x-csrf-token": body.csrfToken },
    } as unknown as FastifyRequest;
    expect(await auth.authorizeOwner(fakeRequest)).toBe(true);
    expect(await auth.verifyCsrf(fakeRequest)).toBe(true);
    const wrongOrigin = {
      ...fakeRequest,
      headers: { cookie, origin: "https://attacker.example", "x-csrf-token": body.csrfToken },
    } as FastifyRequest;
    expect(await auth.verifyCsrf(wrongOrigin)).toBe(false);

    const logout = await server.inject({
      method: "POST",
      url: `${AUTH_PREFIX}/logout`,
      headers: { cookie, origin: ORIGIN, "x-csrf-token": body.csrfToken },
    });
    expect(logout.statusCode).toBe(204);
    expect(logout.headers["set-cookie"]).toEqual(
      expect.arrayContaining([
        expect.stringContaining("grimmlink_owner_session=;"),
        expect.stringContaining("grimmlink_csrf=;"),
      ]),
    );
    expect(
      await server.inject({ method: "GET", url: `${AUTH_PREFIX}/session`, headers: { cookie } }),
    ).toMatchObject({
      statusCode: 401,
    });
  });

  it("rejects duplicate session cookies and limits repeated failed logins", async () => {
    const throttledAuth = makeAuth(() => 1_000_000);
    const throttledServer = Fastify({ logger: false });
    throttledAuth.registerRoutes(throttledServer);
    await throttledServer.ready();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await throttledServer.inject({
        method: "POST",
        url: `${AUTH_PREFIX}/login`,
        headers: { origin: ORIGIN, "content-type": "application/json" },
        payload: { password: "wrong-password-value" },
      });
      expect(response.statusCode).toBe(401);
    }
    const limited = await throttledServer.inject({
      method: "POST",
      url: `${AUTH_PREFIX}/login`,
      headers: { origin: ORIGIN, "content-type": "application/json" },
      payload: { password: PASSWORD },
    });
    expect(limited.statusCode).toBe(429);
    expect(limited.headers["retry-after"]).toBeDefined();
    const duplicateCookie = await throttledServer.inject({
      method: "GET",
      url: `${AUTH_PREFIX}/session`,
      headers: { cookie: "grimmlink_owner_session=a; grimmlink_owner_session=b" },
    });
    expect(duplicateCookie.statusCode).toBe(401);
    await throttledServer.close();
  });

  it("leaves routes disabled without secrets and rejects incomplete configuration", () => {
    expect(createOwnerAuthenticatorFromEnvironment({})).toBeNull();
    expect(
      createOwnerAuthenticator({
        passwordHash: HASH,
        sessionSigningKey: KEY,
        publicOrigin: "http://192.168.1.116:6062",
      }),
    ).toBeDefined();
    expect(() =>
      createOwnerAuthenticator({
        passwordHash: HASH,
        sessionSigningKey: KEY,
        publicOrigin: "http://203.0.113.10:6060",
      }),
    ).toThrow("OWNER_AUTH_CONFIG_INVALID");
    expect(() =>
      createOwnerAuthenticatorFromEnvironment({ GRIMMLINK_OWNER_PASSWORD_HASH: HASH }),
    ).toThrow("OWNER_AUTH_CONFIG_INCOMPLETE");
    expect(() =>
      createOwnerAuthenticatorFromEnvironment({
        GRIMMLINK_OWNER_PASSWORD_HASH: HASH,
        GRIMMLINK_SESSION_SIGNING_KEY: "not-a-32-byte-base64url-key",
      }),
    ).toThrow("OWNER_AUTH_CONFIG_INVALID");
  });
});
