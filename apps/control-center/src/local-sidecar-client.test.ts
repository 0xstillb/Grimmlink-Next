import { afterEach, expect, it, vi } from "vitest";
import { previewOwnerSelectedSidecar } from "./local-sidecar-client.js";

const JSON_TEXT = '{"metadata":{"title":"Sidecar title","seriesNumber":2.5}}';
const validResponse = {
  metadata: { title: "Sidecar title", seriesNumber: 2.5 },
  action: "PREVIEW_ONLY",
  writesAllowed: false,
  source: "OWNER_SELECTED_SIDECAR",
  importsEnabled: false,
  adjacentWriteEnabled: false,
};
const file = (name = "sidecar.json", content = JSON_TEXT): File =>
  new File([content], name, { type: "application/json" });

afterEach(() => vi.unstubAllGlobals());

it("submits one bounded owner-selected Sidecar with same-origin credentials and CSRF", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(validResponse), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  expect(await previewOwnerSelectedSidecar(file(), "A".repeat(32))).toEqual(validResponse);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [path, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  expect(path).toBe("/api/grimmlink/v2/local/sidecar/preview");
  expect(init).toMatchObject({
    method: "POST",
    credentials: "same-origin",
    mode: "same-origin",
    redirect: "error",
    cache: "no-store",
  });
  expect(init.headers).toMatchObject({ "x-csrf-token": "A".repeat(32) });
  expect(JSON.parse(String(init.body))).toEqual({ sidecarJson: JSON_TEXT });
});

it("rejects invalid filenames and oversized files before sending a request", async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  await expect(previewOwnerSelectedSidecar(file("book.opf"), "A".repeat(32))).rejects.toThrow(
    "LOCAL_SIDECAR_FILE_INVALID",
  );
  const oversized = {
    name: "large.json",
    size: 1024 * 1024 + 1,
    arrayBuffer: async () => new ArrayBuffer(0),
  };
  await expect(previewOwnerSelectedSidecar(oversized, "A".repeat(32))).rejects.toThrow(
    "LOCAL_SIDECAR_FILE_INVALID",
  );
  expect(fetchMock).not.toHaveBeenCalled();
});

it("rejects responses that enable import or adjacent writes", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ...validResponse, importsEnabled: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    ),
  );
  await expect(previewOwnerSelectedSidecar(file(), "A".repeat(32))).rejects.toThrow(
    "LOCAL_SIDECAR_RESPONSE_INVALID",
  );
});
