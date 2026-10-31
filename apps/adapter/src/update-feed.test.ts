import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import {
  createGitHubUpdateFeedReader,
  registerIsolatedUpdateFeedRoutes,
  UpdateFeedError,
  type UpdateFeedFetch,
  type UpdateFeedResponse,
} from "./update-feed.js";

const source = { id: "grimmory", owner: "grimmory-tools", repository: "grimmory" } as const;
const release = {
  tag_name: "v3.5.1",
  name: "Grimmory 3.5.1",
  draft: false,
  prerelease: false,
  published_at: "2026-10-30T12:00:00Z",
  html_url: "https://github.com/grimmory-tools/grimmory/releases/tag/v3.5.1",
  body: "Public release notes are intentionally not returned by this endpoint.",
  assets: [
    {
      name: "grimmory.jar",
      size: 1024,
      digest: `sha256:${"a".repeat(64)}`,
      browser_download_url: "https://attacker.invalid/payload.jar",
    },
  ],
};
const advisory = {
  ghsa_id: "GHSA-abcd-1234-efgh",
  summary: "Fixture advisory",
  severity: "high",
  state: "published",
  vulnerabilities: [
    {
      package: { ecosystem: "maven", name: "fixture-package" },
      vulnerable_version_range: "< 1.0.1",
      patched_versions: "1.0.1",
    },
  ],
};

function response(value: unknown, status = 200): UpdateFeedResponse {
  const body = Buffer.from(JSON.stringify(value));
  return {
    status,
    headers: {
      get: (name) =>
        name.toLowerCase() === "content-type"
          ? "application/vnd.github+json; charset=utf-8"
          : name.toLowerCase() === "content-length"
            ? String(body.byteLength)
            : null,
    },
    body: (async function* () {
      yield body;
    })(),
  };
}

function emptyAdvisoryPage(url: string): boolean {
  return new URL(url).pathname.endsWith("/security/advisories");
}

describe("bounded GitHub update feed reader", () => {
  it("uses fixed GitHub GETs and returns only sanitized, non-authorizing evidence", async () => {
    const calls: { url: string; init: Parameters<UpdateFeedFetch>[1] }[] = [];
    const fetch: UpdateFeedFetch = async (url, init) => {
      calls.push({ url, init });
      return response(emptyAdvisoryPage(url) ? [] : release);
    };
    const reader = createGitHubUpdateFeedReader({
      sources: [source],
      fetch,
      now: () => new Date("2026-10-31T00:00:00.000Z"),
    });

    const snapshot = await reader.read("grimmory");
    expect(calls).toHaveLength(2);
    expect(calls.map((call) => new URL(call.url).origin)).toEqual([
      "https://api.github.com",
      "https://api.github.com",
    ]);
    expect(new URL(calls[0]!.url).pathname).toBe("/repos/grimmory-tools/grimmory/releases/latest");
    expect(new URL(calls[1]!.url).searchParams.get("state")).toBe("published");
    expect(new URL(calls[1]!.url).searchParams.get("per_page")).toBe("100");
    expect(calls.every((call) => call.init.method === "GET")).toBe(true);
    expect(calls.every((call) => call.init.redirect === "error")).toBe(true);
    expect(calls.every((call) => call.init.credentials === "omit")).toBe(true);
    expect(calls.every((call) => !("Authorization" in call.init.headers))).toBe(true);
    expect(snapshot).toMatchObject({
      sourceId: "grimmory",
      fetchedAt: "2026-10-31T00:00:00.000Z",
      release: {
        tag: "v3.5.1",
        title: "Grimmory 3.5.1",
        assets: [{ name: "grimmory.jar", size: 1024, sha256: "a".repeat(64) }],
      },
      advisories: [],
      compatibility: "UNKNOWN_REQUIRES_REVIEW",
      impact: "UNCLASSIFIED_REQUIRES_REVIEW",
      approval: "NOT_AUTHORIZED",
      installationAllowed: false,
    });
    expect(JSON.stringify(snapshot)).not.toContain("attacker.invalid");
    expect(JSON.stringify(snapshot)).not.toContain("Public release notes");
  });

  it("follows bounded advisory pages and rejects more than 500 results", async () => {
    const makeAdvisory = (index: number) => ({
      ...advisory,
      ghsa_id: `GHSA-${index.toString(36).padStart(4, "0")}-aaaa-bbbb`,
    });
    const calls: string[] = [];
    const fetch: UpdateFeedFetch = async (url) => {
      calls.push(url);
      const parsed = new URL(url);
      if (parsed.pathname.endsWith("/releases/latest")) return response(release);
      const page = Number(parsed.searchParams.get("page"));
      if (page === 6) return response([]);
      return response(
        Array.from({ length: 100 }, (_, index) => makeAdvisory((page - 1) * 100 + index)),
      );
    };
    const reader = createGitHubUpdateFeedReader({ sources: [source], fetch });
    const result = await reader.read("grimmory");
    expect(result.advisories).toHaveLength(500);
    expect(calls).toHaveLength(7);

    const tooMany: UpdateFeedFetch = async (url) => {
      const parsed = new URL(url);
      if (parsed.pathname.endsWith("/releases/latest")) return response(release);
      const page = Number(parsed.searchParams.get("page"));
      return response(
        page === 6
          ? [makeAdvisory(600)]
          : Array.from({ length: 100 }, (_, index) => makeAdvisory((page - 1) * 100 + index)),
      );
    };
    await expect(
      createGitHubUpdateFeedReader({ sources: [source], fetch: tooMany }).read("grimmory"),
    ).rejects.toMatchObject({ code: "RESPONSE_TOO_LARGE" });
  });

  it("caps streamed bytes and fails closed for malformed or non-200 responses", async () => {
    const oversized: UpdateFeedFetch = async () => ({
      status: 200,
      headers: {
        get: (name) => (name.toLowerCase() === "content-type" ? "application/json" : null),
      },
      body: (async function* () {
        yield new Uint8Array(1_048_577);
      })(),
    });
    await expect(
      createGitHubUpdateFeedReader({ sources: [source], fetch: oversized }).read("grimmory"),
    ).rejects.toMatchObject({ code: "RESPONSE_TOO_LARGE" });

    const unavailable: UpdateFeedFetch = async () =>
      response({ message: "private upstream detail" }, 503);
    await expect(
      createGitHubUpdateFeedReader({ sources: [source], fetch: unavailable }).read("grimmory"),
    ).rejects.toBeInstanceOf(UpdateFeedError);

    const malformed: UpdateFeedFetch = async () =>
      response({ ...release, html_url: "https://attacker.invalid" });
    await expect(
      createGitHubUpdateFeedReader({ sources: [source], fetch: malformed }).read("grimmory"),
    ).rejects.toMatchObject({ code: "RESPONSE_INVALID" });
  });

  it("rejects caller aborts before making an outbound request", async () => {
    let calls = 0;
    const reader = createGitHubUpdateFeedReader({
      sources: [source],
      fetch: async () => {
        calls += 1;
        return response(release);
      },
    });
    const controller = new AbortController();
    controller.abort();
    await expect(reader.read("grimmory", controller.signal)).rejects.toMatchObject({
      code: "REQUEST_ABORTED",
    });
    expect(calls).toBe(0);
  });

  it("aborts an unresponsive feed request at the configured timeout", async () => {
    const fetch: UpdateFeedFetch = async (_url, init) =>
      await new Promise<UpdateFeedResponse>((_resolve, reject) => {
        init.signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
      });
    const reader = createGitHubUpdateFeedReader({ sources: [source], fetch, timeoutMs: 250 });
    await expect(reader.read("grimmory")).rejects.toMatchObject({ code: "REQUEST_TIMEOUT" });
  });

  it("requires owner authorization before reading feeds and returns no-store responses", async () => {
    const server = Fastify({ logger: false });
    let reads = 0;
    const reader = {
      sourceIds: ["grimmory"],
      read: async (sourceId: string) => {
        reads += 1;
        if (sourceId !== "grimmory") throw new UpdateFeedError("UNKNOWN_SOURCE");
        return {
          sourceId: "grimmory",
          fetchedAt: "2026-10-31T00:00:00.000Z",
          release: { tag: "v3.5.1" },
          advisories: [],
          sourceEvidence: "PUBLIC_GITHUB_PAYLOAD_UNVERIFIED",
          compatibility: "UNKNOWN_REQUIRES_REVIEW",
          impact: "UNCLASSIFIED_REQUIRES_REVIEW",
          approval: "NOT_AUTHORIZED",
          installationAllowed: false,
        } as const;
      },
    };
    registerIsolatedUpdateFeedRoutes(server, {
      authorizeOwner: async (request) => request.headers.authorization === "Bearer test-owner",
      reader,
    });
    await server.ready();

    const denied = await server.inject({
      method: "GET",
      url: "/api/grimmlink/v2/local/updates/grimmory",
    });
    expect(denied.statusCode).toBe(403);
    expect(reads).toBe(0);
    expect(denied.body).not.toContain("v3.5.1");

    const allowed = await server.inject({
      method: "GET",
      url: "/api/grimmlink/v2/local/updates/grimmory",
      headers: { authorization: "Bearer test-owner" },
    });
    expect(allowed.statusCode).toBe(200);
    expect(allowed.headers["cache-control"]).toBe("no-store");
    expect(allowed.headers["x-content-type-options"]).toBe("nosniff");
    expect(allowed.json().snapshot.approval).toBe("NOT_AUTHORIZED");
    expect(reads).toBe(1);

    const unknown = await server.inject({
      method: "GET",
      url: "/api/grimmlink/v2/local/updates/unknown",
      headers: { authorization: "Bearer test-owner" },
    });
    expect(unknown.statusCode).toBe(404);
    expect(unknown.json()).toEqual({ error: "UPDATE_SOURCE_NOT_FOUND" });
    expect(reads).toBe(2);
    await server.close();
  });
});
