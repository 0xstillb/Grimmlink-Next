import Fastify from "fastify";
import { expect, it } from "vitest";
import { registerLocalOpfPreviewRoutes } from "./local-opf-preview-routes.js";

const PATH = "/api/grimmlink/v2/local/opf/preview";
const VALID_OPF = `<package xmlns="http://www.idpf.org/2007/opf" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <metadata><dc:title>Preview Title</dc:title><dc:language>th</dc:language></metadata>
  <manifest><item id="cover" href="images/cover.png" media-type="image/png" properties="cover-image"/></manifest>
</package>`;

function setup() {
  const server = Fastify({ logger: false, ajv: { customOptions: { removeAdditional: false } } });
  let owner = false;
  registerLocalOpfPreviewRoutes(server, {
    authorizeOwner: async () => owner,
    verifyCsrf: async (request) => request.headers["x-csrf-token"] === "test-csrf",
    registerRoutes: () => undefined,
  });
  return { server, setOwner: (value: boolean) => (owner = value) };
}

it("requires owner and CSRF, then returns only a read-only preview of submitted bytes", async () => {
  const { server, setOwner } = setup();
  await server.ready();
  const anonymous = await server.inject({
    method: "POST",
    url: PATH,
    payload: { opfXml: VALID_OPF },
  });
  expect(anonymous.statusCode).toBe(403);
  expect(anonymous.json()).toEqual({ error: "OWNER_AUTH_REQUIRED" });

  setOwner(true);
  const noCsrf = await server.inject({ method: "POST", url: PATH, payload: { opfXml: VALID_OPF } });
  expect(noCsrf.statusCode).toBe(403);
  expect(noCsrf.json()).toEqual({ error: "CSRF_REQUIRED" });

  const response = await server.inject({
    method: "POST",
    url: PATH,
    headers: { "x-csrf-token": "test-csrf" },
    payload: { opfXml: VALID_OPF },
  });
  expect(response.statusCode).toBe(200);
  expect(response.headers["cache-control"]).toBe("no-store");
  expect(response.json()).toEqual({
    metadata: { title: "Preview Title", language: "th" },
    coverHref: "images/cover.png",
    action: "DRY_RUN_ONLY",
    writesAllowed: false,
    source: "OWNER_SELECTED_OPF",
  });
  expect(response.body).not.toContain("<package");
  await server.close();
});

it("rejects unknown request fields, unsafe covers, DTDs and malformed OPF", async () => {
  const { server, setOwner } = setup();
  setOwner(true);
  await server.ready();
  const headers = { "x-csrf-token": "test-csrf" };
  const extra = await server.inject({
    method: "POST",
    url: PATH,
    headers,
    payload: { opfXml: VALID_OPF, persist: true },
  });
  expect(extra.statusCode).toBe(400);

  for (const opfXml of [
    '<!DOCTYPE package [<!ENTITY x SYSTEM "file:///secret">]><package><metadata/></package>',
    VALID_OPF.replace("images/cover.png", "../secret.png"),
    "<broken",
  ]) {
    const response = await server.inject({
      method: "POST",
      url: PATH,
      headers,
      payload: { opfXml },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: "OPF_PREVIEW_INVALID" });
  }
  await server.close();
});
