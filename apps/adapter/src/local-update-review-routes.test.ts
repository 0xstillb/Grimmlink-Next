import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import type { OwnerAuthenticator } from "./auth/owner-auth.js";
import {
  hashUpdateFeedEvidence,
  type UpdateFeedSnapshot,
  type UpdateFeedReader,
} from "./update-feed.js";
import { registerLocalUpdateReviewRoutes } from "./local-update-review-routes.js";
import type { LocalUpdateReviewLedger, UpdateReviewRecord } from "./local-update-review-sqlite.js";
import { COMPATIBILITY_MANIFEST_SHA256 } from "./compatibility-manifest.js";

function makeSnapshot(tag = "v1.2.3"): UpdateFeedSnapshot {
  const base = {
    sourceId: "grimmory",
    fetchedAt: "2026-10-31T00:00:00.000Z",
    release: {
      tag,
      title: "Grimmory 1.2.3",
      publishedAt: "2026-10-30T12:00:00.000Z",
      url: `https://github.com/grimmory-tools/grimmory/releases/tag/${tag}`,
      assets: [],
    },
    advisories: [],
    sourceEvidence: "PUBLIC_GITHUB_PAYLOAD_UNVERIFIED" as const,
    compatibility: "UNKNOWN_REQUIRES_REVIEW" as const,
    impact: "UNCLASSIFIED_REQUIRES_REVIEW" as const,
    approval: "NOT_AUTHORIZED" as const,
    installationAllowed: false as const,
  };
  return { ...base, evidenceSha256: hashUpdateFeedEvidence(base) };
}

function makeServer() {
  let current = makeSnapshot();
  let reads = 0;
  const records: UpdateReviewRecord[] = [];
  const ownerAuth = {
    authorizeOwner: async (request: { headers: Record<string, string | string[] | undefined> }) =>
      request.headers["x-test-owner"] === "yes",
    verifyCsrf: async (request: { headers: Record<string, string | string[] | undefined> }) =>
      request.headers["x-test-csrf"] === "yes",
    registerRoutes: () => undefined,
  } as unknown as OwnerAuthenticator;
  const reader: UpdateFeedReader = {
    sourceIds: ["grimmory"],
    read: async () => {
      reads += 1;
      return current;
    },
  };
  const ledger = {
    list: () => records,
    record: (input) => {
      const item: UpdateReviewRecord = {
        ...input,
        id: "6ca5a426-3ea8-4a90-bfad-512301b825ec",
        reviewer: "LOCAL_OWNER_SESSION",
        reviewedAt: 1_798_000_000_000,
        installationAllowed: false,
      };
      records.unshift(item);
      return item;
    },
  } as unknown as LocalUpdateReviewLedger;
  const server = Fastify({ logger: false });
  registerLocalUpdateReviewRoutes(server, { ownerAuth, reader, ledger });
  return {
    server,
    records,
    reads: () => reads,
    setCurrent: (snapshot: UpdateFeedSnapshot) => (current = snapshot),
  };
}

const reviewBody = (snapshot: UpdateFeedSnapshot, overrides: Record<string, unknown> = {}) => ({
  sourceId: snapshot.sourceId,
  candidateTag: snapshot.release.tag,
  evidenceSha256: snapshot.evidenceSha256,
  compatibilityManifestSha256: COMPATIBILITY_MANIFEST_SHA256,
  compatibility: "UNKNOWN",
  impact: "UNKNOWN",
  decision: "DEFERRED",
  rationale: "Compatibility evidence is incomplete; keep this candidate deferred.",
  ...overrides,
});

describe("local update review route", () => {
  it("requires the owner session for list and owner session plus CSRF for changes", async () => {
    const fixture = makeServer();
    await fixture.server.ready();
    const path = "/api/grimmlink/v2/local/update-reviews";
    expect((await fixture.server.inject({ method: "GET", url: path })).statusCode).toBe(403);
    const noCsrf = await fixture.server.inject({
      method: "POST",
      url: path,
      headers: { "x-test-owner": "yes" },
      payload: reviewBody(makeSnapshot()),
    });
    expect(noCsrf.statusCode).toBe(403);
    expect(noCsrf.json()).toEqual({ error: "CSRF_REQUIRED" });
    expect(fixture.reads()).toBe(0);
    const ownerList = await fixture.server.inject({
      method: "GET",
      url: path,
      headers: { "x-test-owner": "yes" },
    });
    expect(ownerList.json()).toMatchObject({
      compatibilityManifestSha256: COMPATIBILITY_MANIFEST_SHA256,
      installationAllowed: false,
    });
    expect(ownerList.json().compatibilityManifest.components).toHaveLength(5);
    expect(ownerList.json().compatibilityManifest.components[0].id).toBe("grimmory");
    await fixture.server.close();
  });

  it("rechecks the exact current evidence before recording an append-only decision", async () => {
    const fixture = makeServer();
    await fixture.server.ready();
    const path = "/api/grimmlink/v2/local/update-reviews";
    const stale = await fixture.server.inject({
      method: "POST",
      url: path,
      headers: { "x-test-owner": "yes", "x-test-csrf": "yes" },
      payload: reviewBody(makeSnapshot("v1.2.2")),
    });
    expect(stale.statusCode).toBe(409);
    expect(stale.json()).toEqual({ error: "UPDATE_EVIDENCE_STALE" });
    expect(fixture.records).toHaveLength(0);

    const snapshot = makeSnapshot();
    const staleManifest = await fixture.server.inject({
      method: "POST",
      url: path,
      headers: { "x-test-owner": "yes", "x-test-csrf": "yes" },
      payload: reviewBody(snapshot, { compatibilityManifestSha256: "f".repeat(64) }),
    });
    expect(staleManifest.statusCode).toBe(409);
    expect(staleManifest.json()).toEqual({ error: "COMPATIBILITY_MANIFEST_STALE" });
    expect(fixture.reads()).toBe(1);

    const recorded = await fixture.server.inject({
      method: "POST",
      url: path,
      headers: { "x-test-owner": "yes", "x-test-csrf": "yes" },
      payload: reviewBody(snapshot),
    });
    expect(recorded.statusCode).toBe(201);
    expect(recorded.json()).toMatchObject({
      review: {
        sourceId: "grimmory",
        candidateTag: "v1.2.3",
        evidenceSha256: snapshot.evidenceSha256,
        reviewer: "LOCAL_OWNER_SESSION",
        decision: "DEFERRED",
        installationAllowed: false,
      },
      installationAllowed: false,
    });
    expect(fixture.records).toHaveLength(1);
    expect(fixture.reads()).toBe(2);
    const listed = await fixture.server.inject({
      method: "GET",
      url: path,
      headers: { "x-test-owner": "yes" },
    });
    expect(listed.statusCode).toBe(200);
    expect(listed.json().reviews).toHaveLength(1);
    await fixture.server.close();
  });

  it("does not submit unknown compatibility or impact for Phase09 evaluation", async () => {
    const fixture = makeServer();
    await fixture.server.ready();
    const response = await fixture.server.inject({
      method: "POST",
      url: "/api/grimmlink/v2/local/update-reviews",
      headers: { "x-test-owner": "yes", "x-test-csrf": "yes" },
      payload: reviewBody(makeSnapshot(), { decision: "SUBMIT_FOR_PHASE09_EVALUATION" }),
    });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: "UPDATE_REVIEW_PHASE09_EVIDENCE_REQUIRED" });
    expect(fixture.reads()).toBe(0);
    expect(fixture.records).toHaveLength(0);
    await fixture.server.close();
  });
});
