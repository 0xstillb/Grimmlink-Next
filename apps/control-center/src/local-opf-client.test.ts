import { afterEach, expect, it, vi } from "vitest";
import { previewOwnerSelectedOpf } from "./local-opf-client.js";

const XML =
  '<package><metadata><dc:title xmlns:dc="http://purl.org/dc/elements/1.1/">A</dc:title></metadata></package>';
const validResponse = {
  metadata: { title: "A" },
  coverHref: null,
  action: "DRY_RUN_ONLY",
  writesAllowed: false,
  source: "OWNER_SELECTED_OPF",
};

const file = (name = "book.opf", content = XML): File =>
  new File([content], name, { type: "application/oebps-package+xml" });

afterEach(() => vi.unstubAllGlobals());

it("uploads only a bounded owner-selected OPF with same-origin credentials and CSRF", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(validResponse), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  const preview = await previewOwnerSelectedOpf(file(), "A".repeat(32));
  expect(preview).toEqual(validResponse);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [path, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  expect(path).toBe("/api/grimmlink/v2/local/opf/preview");
  expect(init).toMatchObject({
    method: "POST",
    credentials: "same-origin",
    mode: "same-origin",
    redirect: "error",
    cache: "no-store",
  });
  expect(init.headers).toMatchObject({ "x-csrf-token": "A".repeat(32) });
  expect(JSON.parse(String(init.body))).toEqual({ opfXml: XML });
});

it("rejects invalid filenames, oversized files, and unsafe response fields before rendering", async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  await expect(previewOwnerSelectedOpf(file("book.epub"), "A".repeat(32))).rejects.toThrow(
    "LOCAL_OPF_FILE_INVALID",
  );
  const oversized = {
    name: "large.opf",
    size: 1024 * 1024 + 1,
    arrayBuffer: async () => new ArrayBuffer(0),
  };
  await expect(previewOwnerSelectedOpf(oversized, "A".repeat(32))).rejects.toThrow(
    "LOCAL_OPF_FILE_INVALID",
  );
  expect(fetchMock).not.toHaveBeenCalled();
});

it("rejects unexpected response keys and traversal cover references", async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  for (const invalid of [
    { ...validResponse, officialWrite: true },
    { ...validResponse, coverHref: "../secret.png" },
  ]) {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(invalid), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    await expect(previewOwnerSelectedOpf(file(), "A".repeat(32))).rejects.toThrow(
      "LOCAL_OPF_RESPONSE_INVALID",
    );
  }
});
