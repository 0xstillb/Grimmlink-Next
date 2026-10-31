import { afterEach, expect, it, vi } from "vitest";
import { fetchLocalReading } from "./local-reading-client.js";

afterEach(() => vi.unstubAllGlobals());

const snapshot = {
  source: "LOCAL_SQLITE_PHASE06_OFFLINE",
  items: [
    {
      bookId: "book-1",
      bookFileId: "file-1",
      format: "EPUB",
      editionSha256: "a".repeat(64),
      revision: 2,
      status: "LOCAL_PREVIEW_ONLY",
      position: {
        kind: "EPUB_EXACT",
        nativePosition: "epubcfi(/6/2!/4/2/1:0)",
        evidence: "EPUB_DOM_ROUNDTRIP_ONLY",
      },
      percentage: null,
    },
  ],
  truncated: false,
  readerConnection: "NOT_CONNECTED",
  officialWrites: "OFF",
};

it("reads bounded same-origin local snapshots and requires explicit no-progress semantics", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(snapshot), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  expect(await fetchLocalReading()).toEqual(snapshot);
  expect(fetchMock).toHaveBeenCalledWith(
    "/api/grimmlink/v2/local/reading",
    expect.objectContaining({
      method: "GET",
      credentials: "same-origin",
      mode: "same-origin",
      redirect: "error",
      cache: "no-store",
    }),
  );
});

it.each([
  { ...snapshot, officialWrites: "ON" },
  { ...snapshot, items: [{ ...snapshot.items[0], percentage: 75 }] },
  { ...snapshot, items: [{ ...snapshot.items[0], token: "secret" }] },
  {
    ...snapshot,
    items: [
      {
        ...snapshot.items[0],
        position: { ...snapshot.items[0]!.position!, evidence: "LIVE_READER" },
      },
    ],
  },
])("rejects snapshots that overclaim progress or include unknown data", async (value) => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify(value), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    ),
  );
  await expect(fetchLocalReading()).rejects.toThrow("LOCAL_READING_RESPONSE_INVALID");
});
