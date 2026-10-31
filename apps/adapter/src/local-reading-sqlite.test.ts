import Fastify from "fastify";
import type { LocalStore } from "@grimmlink/persistence";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import { createLocalReadingRouteSource } from "./local-reading-sqlite.js";
import { registerLocalReadingRoutes } from "./local-reading-routes.js";

type TestSqlite = {
  exec: (sql: string) => void;
  prepare: (sql: string) => { run: (...args: (string | number | null)[]) => unknown };
  close: () => void;
};
const persistenceRequire = createRequire(
  fileURLToPath(new URL("../../../packages/persistence/package.json", import.meta.url)),
);
const Database = persistenceRequire("better-sqlite3") as new (path: string) => TestSqlite;

it("serves only the authenticated owner's bounded offline reading projection", async () => {
  const sqlite = new Database(":memory:");
  sqlite.exec(`
    CREATE TABLE single_owner (slot INTEGER PRIMARY KEY CHECK(slot=1), owner_id TEXT NOT NULL);
    CREATE TABLE phase06_offline_progress (
      book_file_id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      book_id TEXT NOT NULL,
      format TEXT NOT NULL CHECK(format IN ('EPUB','PDF')),
      edition_sha256 TEXT NOT NULL,
      verified_fixture_page_count INTEGER,
      revision INTEGER NOT NULL DEFAULT 0,
      position_kind TEXT,
      native_position TEXT,
      page_number INTEGER,
      last_event_id TEXT,
      position_evidence TEXT
    );
  `);
  const store = { sqlite, orm: undefined, close: () => sqlite.close() } as unknown as LocalStore;
  let ownerAuthorized = false;
  try {
    const insert = sqlite.prepare(
      "INSERT INTO phase06_offline_progress(book_file_id,owner_id,book_id,format,edition_sha256,verified_fixture_page_count,revision,position_kind,native_position,page_number,position_evidence) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
    );
    insert.run(
      "epub-file",
      "owner",
      "book-epub",
      "EPUB",
      "a".repeat(64),
      null,
      2,
      "EPUB_EXACT",
      "epubcfi(/6/2!/4/2/1:0)",
      null,
      "OFFLINE_SYNTHETIC_FIXTURE_ONLY",
    );
    insert.run(
      "pdf-file",
      "owner",
      "book-pdf",
      "PDF",
      "b".repeat(64),
      100,
      1,
      "PDF_PAGE",
      null,
      7,
      "OFFLINE_FIXTURE_PAGE_COUNT_ONLY",
    );
    insert.run(
      "empty-file",
      "owner",
      "book-empty",
      "EPUB",
      "c".repeat(64),
      null,
      0,
      null,
      null,
      null,
      null,
    );
    insert.run(
      "other-owner-file",
      "other-owner",
      "private-book",
      "EPUB",
      "d".repeat(64),
      null,
      2,
      "EPUB_EXACT",
      "epubcfi(/6/2!/4/2/1:0)",
      null,
      "OFFLINE_SYNTHETIC_FIXTURE_ONLY",
    );

    const ownerAuth = {
      authorizeOwner: async () => ownerAuthorized,
      verifyCsrf: async () => false,
      registerRoutes: () => undefined,
    };
    const source = createLocalReadingRouteSource(store, ownerAuth);
    const server = Fastify({ logger: false });
    registerLocalReadingRoutes(server, source);
    await server.ready();
    const path = "/api/grimmlink/v2/local/reading";

    expect((await server.inject({ method: "GET", url: path })).statusCode).toBe(403);
    ownerAuthorized = true;
    const response = await server.inject({ method: "GET", url: path });
    expect(response.statusCode).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    const snapshot = response.json();
    expect(snapshot).toMatchObject({
      source: "LOCAL_SQLITE_PHASE06_OFFLINE",
      truncated: false,
      readerConnection: "NOT_CONNECTED",
      officialWrites: "OFF",
      items: [
        {
          bookId: "book-empty",
          status: "NO_POSITION",
          position: null,
          percentage: null,
        },
        {
          bookId: "book-epub",
          status: "LOCAL_PREVIEW_ONLY",
          position: {
            kind: "EPUB_EXACT",
            evidence: "OFFLINE_SYNTHETIC_FIXTURE_ONLY",
          },
          percentage: null,
        },
        {
          bookId: "book-pdf",
          status: "LOCAL_PREVIEW_ONLY",
          position: {
            kind: "PDF_PAGE",
            pageNumber: 7,
            pageCount: 100,
            evidence: "OFFLINE_FIXTURE_PAGE_COUNT_ONLY",
          },
          percentage: null,
        },
      ],
    });
    expect(JSON.stringify(snapshot)).not.toContain("private-book");
    expect(snapshot.items.every((item: { percentage: unknown }) => item.percentage === null)).toBe(
      true,
    );
    for (let index = 0; index < 101; index += 1) {
      insert.run(
        `extra-file-${index}`,
        "owner",
        `extra-book-${index}`,
        "EPUB",
        "e".repeat(64),
        null,
        0,
        null,
        null,
        null,
        null,
      );
    }
    const bounded = (await server.inject({ method: "GET", url: path })).json();
    expect(bounded.items).toHaveLength(100);
    expect(bounded.truncated).toBe(true);
    await server.close();
  } finally {
    store.close();
  }
});
