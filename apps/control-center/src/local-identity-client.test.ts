import { afterEach, expect, it, vi } from "vitest";
import { fetchLocalIdentity } from "./local-identity-client.js";

afterEach(() => vi.unstubAllGlobals());

const snapshot = {
  source: "LOCAL_SQLITE_PHASE05_OFFLINE",
  officialOwnership: "NOT_VERIFIED",
  items: [
    {
      koDocumentMd5: "0123456789abcdef0123456789abcdef",
      bookFileId: "file-1",
      editionSha256: "a".repeat(64),
      localWriterMode: "DISABLED",
      revision: 0,
      identityEvidence: "LOCAL_REGISTRATION_ONLY",
    },
  ],
  truncated: false,
  officialWrites: "OFF",
};

it("reads only the same-origin redacted identity registry", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(snapshot), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  expect(await fetchLocalIdentity()).toEqual(snapshot);
  expect(fetchMock).toHaveBeenCalledWith(
    "/api/grimmlink/v2/local/identity",
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
  { ...snapshot, officialOwnership: "VERIFIED" },
  { ...snapshot, officialWrites: "ON" },
  { ...snapshot, items: [{ ...snapshot.items[0], token: "secret" }] },
  { ...snapshot, items: [{ ...snapshot.items[0], editionSha256: "bad" }] },
])("rejects identity responses that overclaim or contain unknown fields", async (value) => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify(value), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    ),
  );
  await expect(fetchLocalIdentity()).rejects.toThrow("LOCAL_IDENTITY_RESPONSE_INVALID");
});
