import Fastify from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import type { OwnerAuthenticator } from "./auth/owner-auth.js";
import {
  registerLocalReaderRoutes,
  type LocalReaderRouteSource,
  type ReaderFile,
} from "./local-reader-routes.js";

const FILE: ReaderFile = {
  bookId: "book-1",
  bookFileId: "file-1",
  editionSha256: "a".repeat(64),
};
const TOKEN = "t".repeat(43);

describe("Staging-local KOReader API", () => {
  const servers: ReturnType<typeof Fastify>[] = [];
  afterEach(async () => {
    await Promise.all(servers.splice(0).map((server) => server.close()));
  });

  function createServer() {
    let paired = true;
    const files = new Map<string, ReaderFile>();
    const personal = new Map<string, { revision: number; deleted: boolean; value: unknown }>();
    let sessionCount = 0;
    const ownerAuth = {
      authorizeOwner: async (request: { headers: Record<string, unknown> }) =>
        request.headers.cookie === "owner-session",
      verifyCsrf: async (request: { headers: Record<string, unknown> }) =>
        request.headers["x-csrf-token"] === "owner-csrf",
    } as unknown as OwnerAuthenticator;
    const source: LocalReaderRouteSource = {
      ownerAuth,
      authorizeReader: async (request) => {
        if (
          !paired ||
          request.headers.authorization !== `Bearer ${TOKEN}` ||
          request.headers["x-reader-device-id"] !== "reader-1"
        )
          return null;
        return { ownerId: "owner", deviceId: "reader-1", token: TOKEN };
      },
      now: () => 1_000,
      listFiles: () => [...files.values()],
      registerFile: (file) => {
        const existing = files.get(file.bookFileId);
        if (existing && JSON.stringify(existing) !== JSON.stringify(file))
          throw new Error("FILE_CONFLICT");
        files.set(file.bookFileId, file);
      },
      readPersonal: (_principal, fileId, editionSha256, _kind, recordId) => {
        const file = files.get(fileId);
        if (!file || file.editionSha256 !== editionSha256) throw new Error("FILE_MISMATCH");
        return personal.get(`${fileId}/${recordId}`) ?? null;
      },
      writePersonal: (_principal, fileId, editionSha256, _kind, recordId, event) => {
        const file = files.get(fileId);
        if (!file || file.editionSha256 !== editionSha256) throw new Error("FILE_MISMATCH");
        const key = `${fileId}/${recordId}`;
        const old = personal.get(key);
        const revision = old?.revision ?? 0;
        if (event.expectedRevision !== revision) return { status: "CONFLICT", revision };
        const next = {
          revision: revision + 1,
          deleted: event.action === "DELETE",
          value: event.value,
        };
        personal.set(key, next);
        return { status: "LOCAL_RECORDED", revision: next.revision };
      },
      writeSession: (_principal, _fileId, _editionSha256, event) => {
        sessionCount += event.action === "START" ? 1 : -1;
        return { status: "LOCAL_RECORDED", revision: sessionCount };
      },
      previewShelf: (_principal, known, selected) => ({
        mode: "MANUAL_PREVIEW_ONLY",
        add: selected
          .filter((file) => !known.some((old) => old.bookFileId === file.bookFileId))
          .map((file) => file.bookFileId),
        remove: known
          .filter((file) => !selected.some((next) => next.bookFileId === file.bookFileId))
          .map((file) => file.bookFileId),
      }),
    };
    const server = Fastify({ logger: false });
    registerLocalReaderRoutes(server, source);
    servers.push(server);
    return {
      server,
      setPaired: (value: boolean) => {
        paired = value;
      },
    };
  }

  it("requires a paired token, records local personal/session events and never claims Official sync", async () => {
    const { server, setPaired } = createServer();
    const prefix = "/api/grimmlink/v2/local/reader";
    expect((await server.inject({ method: "GET", url: `${prefix}/status` })).statusCode).toBe(401);
    const auth = { authorization: `Bearer ${TOKEN}`, "x-reader-device-id": "reader-1" };
    const status = await server.inject({ method: "GET", url: `${prefix}/status`, headers: auth });
    expect(status.json()).toMatchObject({
      status: "PAIRED",
      mode: "STAGING_LOCAL_ONLY",
      officialForwarding: "DENY_ALL",
      personalPersistence: "LOCAL_SQLITE_ONLY",
      shelfMutation: "OFF",
    });

    const addFile = await server.inject({
      method: "POST",
      url: `${prefix}/files`,
      headers: { cookie: "owner-session", "x-csrf-token": "owner-csrf" },
      payload: FILE,
    });
    expect(addFile.statusCode).toBe(201);
    const path = `${prefix}/personal/file-1/BOOKMARK/bm-1`;
    const write = await server.inject({
      method: "PUT",
      url: path,
      headers: auth,
      payload: {
        editionSha256: FILE.editionSha256,
        eventId: "event-1",
        expectedRevision: 0,
        action: "UPSERT",
        value: { kind: "BOOKMARK", nativePosition: "epubcfi(/6/2)", label: "test" },
      },
    });
    expect(write.statusCode).toBe(200);
    expect(write.json()).toEqual({ status: "LOCAL_RECORDED", revision: 1 });
    const read = await server.inject({
      method: "GET",
      url: path,
      headers: {
        ...auth,
        "x-edition-sha256": FILE.editionSha256,
      },
    });
    expect(read.json()).toMatchObject({ revision: 1, deleted: false });

    const session = await server.inject({
      method: "POST",
      url: `${prefix}/sessions/session-1`,
      headers: auth,
      payload: {
        bookFileId: FILE.bookFileId,
        editionSha256: FILE.editionSha256,
        eventId: "session-event-1",
        expectedRevision: 0,
        action: "START",
      },
    });
    expect(session.statusCode).toBe(200);
    expect(session.json()).toMatchObject({ status: "LOCAL_RECORDED" });
    setPaired(false);
    expect(
      (await server.inject({ method: "GET", url: `${prefix}/files`, headers: auth })).statusCode,
    ).toBe(401);
  });

  it("rejects missing owner CSRF, edition mismatch, invalid events and unsupported routes", async () => {
    const { server } = createServer();
    const prefix = "/api/grimmlink/v2/local/reader";
    expect(
      (
        await server.inject({
          method: "POST",
          url: `${prefix}/files`,
          headers: { cookie: "owner-session" },
          payload: FILE,
        })
      ).statusCode,
    ).toBe(403);
    await server.inject({
      method: "POST",
      url: `${prefix}/files`,
      headers: { cookie: "owner-session", "x-csrf-token": "owner-csrf" },
      payload: FILE,
    });
    const auth = { authorization: `Bearer ${TOKEN}`, "x-reader-device-id": "reader-1" };
    expect(
      (
        await server.inject({
          method: "PUT",
          url: `${prefix}/personal/file-1/RATING/rating`,
          headers: auth,
          payload: {
            editionSha256: "b".repeat(64),
            eventId: "event-2",
            expectedRevision: 0,
            action: "UPSERT",
            value: { kind: "RATING", score: 5 },
          },
        })
      ).statusCode,
    ).toBe(409);
    expect(
      (
        await server.inject({
          method: "PUT",
          url: `${prefix}/personal/file-1/RESET/rating`,
          headers: auth,
          payload: {},
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (await server.inject({ method: "GET", url: `${prefix}/status?debug=true`, headers: auth }))
        .statusCode,
    ).toBe(200);
  });
});
