import { describe, expect, it } from "vitest";
import {
  assessRelease,
  parsePublishedAdvisories,
  parseStableRelease,
  type UpstreamSource,
} from "./update-evidence.js";

const source: UpstreamSource = { owner: "0xstillb", repository: "Grimmlink-Next" };

const releaseFixture = {
  tag_name: "v1.2.3",
  name: "Grimmlink Next 1.2.3",
  draft: false,
  prerelease: false,
  published_at: "2026-10-30T12:00:00Z",
  html_url: "https://github.com/0xstillb/Grimmlink-Next/releases/tag/v1.2.3",
  body: "Fixture only. Not a fetched or approved release.",
  assets: [
    {
      name: "grimmlink-next.zip",
      size: 1024,
      digest: `sha256:${"a".repeat(64)}`,
      browser_download_url:
        "https://github.com/0xstillb/Grimmlink-Next/releases/download/v1.2.3/grimmlink-next.zip",
    },
  ],
};

const advisoryFixture = [
  {
    ghsa_id: "GHSA-abcd-1234-efgh",
    summary: "Fixture advisory for parser coverage",
    severity: "high",
    state: "published",
    vulnerabilities: [
      {
        package: { ecosystem: "npm", name: "fixture-package" },
        vulnerable_version_range: ">= 1.0.0, < 1.0.1",
        patched_versions: "1.0.1",
      },
    ],
  },
];

describe("offline upstream update evidence", () => {
  it("parses a stable release using a canonical repository link and bounded assets", () => {
    expect(parseStableRelease(releaseFixture, source)).toEqual({
      tag: "v1.2.3",
      title: "Grimmlink Next 1.2.3",
      publishedAt: "2026-10-30T12:00:00Z",
      url: "https://github.com/0xstillb/Grimmlink-Next/releases/tag/v1.2.3",
      assets: [
        {
          name: "grimmlink-next.zip",
          size: 1024,
          sha256: "a".repeat(64),
        },
      ],
    });
  });

  it("rejects prereleases, drafts, noncanonical links, oversized notes and unsafe asset names", () => {
    expect(parseStableRelease({ ...releaseFixture, prerelease: true }, source)).toBeNull();
    expect(parseStableRelease({ ...releaseFixture, draft: true }, source)).toBeNull();
    expect(
      parseStableRelease(
        { ...releaseFixture, html_url: "https://attacker.invalid/releases/tag/v1.2.3" },
        source,
      ),
    ).toBeNull();
    expect(parseStableRelease({ ...releaseFixture, body: "x".repeat(16_001) }, source)).toBeNull();
    expect(
      parseStableRelease(
        {
          ...releaseFixture,
          assets: [{ ...releaseFixture.assets[0], name: "../payload.zip" }],
        },
        source,
      ),
    ).toBeNull();
  });

  it("parses published advisory identifiers and keeps unknown severity visible", () => {
    const parsed = parsePublishedAdvisories([
      advisoryFixture[0],
      { ...advisoryFixture[0], ghsa_id: "GHSA-aaaa-bbbb-cccc", severity: "future-value" },
    ]);
    expect(parsed).toHaveLength(2);
    expect(parsed?.[0]).toMatchObject({ id: "GHSA-abcd-1234-efgh", severity: "high" });
    expect(parsed?.[1]?.severity).toBe("unknown");
    expect(parsed?.[0]?.packages[0]).toEqual({
      ecosystem: "npm",
      name: "fixture-package",
      vulnerableRange: ">= 1.0.0, < 1.0.1",
      patchedVersions: "1.0.1",
    });
  });

  it("fails closed on malformed, duplicate or unpublished advisory evidence", () => {
    expect(parsePublishedAdvisories({})).toBeNull();
    expect(
      parsePublishedAdvisories([
        advisoryFixture[0],
        { ...advisoryFixture[0], vulnerabilities: [{ package: null }] },
      ]),
    ).toBeNull();
    expect(parsePublishedAdvisories([advisoryFixture[0], advisoryFixture[0]])).toBeNull();
    expect(parsePublishedAdvisories([{ ...advisoryFixture[0], state: "draft" }])).toBeNull();
  });

  it("never infers compatibility, approval or installation from release metadata", () => {
    const release = parseStableRelease(releaseFixture, source);
    const advisories = parsePublishedAdvisories(advisoryFixture);
    expect(release).not.toBeNull();
    expect(advisories).not.toBeNull();

    const review = assessRelease(release!, null, advisories);
    expect(review).toEqual({
      candidateTag: "v1.2.3",
      installedVersion: null,
      tagMatchesInstalled: false,
      installedVersionEvidence: "UNKNOWN",
      compatibility: "UNKNOWN_REQUIRES_REVIEW",
      impact: "UNCLASSIFIED_REQUIRES_REVIEW",
      advisoryEvidence: "PAYLOAD_UNVERIFIED",
      advisoryCount: 1,
      approval: "NOT_AUTHORIZED",
      installationAllowed: false,
    });
    expect(assessRelease(release!, "v1.2.3", advisories).tagMatchesInstalled).toBe(true);
    expect(assessRelease(release!, "v1.2.3", advisories).installedVersionEvidence).toBe(
      "UNATTESTED",
    );
    expect(assessRelease(release!, null, null)).toMatchObject({
      advisoryEvidence: "UNAVAILABLE",
      advisoryCount: null,
    });
  });
});
