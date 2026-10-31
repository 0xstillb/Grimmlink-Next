/**
 * Bounded parsers for GitHub release/advisory payloads and a fail-closed review
 * summary. This module deliberately has no network, approval, download, or
 * installation capability; callers must supply payloads from a trusted route.
 *
 * Payload fields follow GitHub's REST release and repository-advisory APIs:
 * https://docs.github.com/en/rest/releases/releases
 * https://docs.github.com/en/rest/security-advisories/repository-advisories
 */

export type UpstreamSource = Readonly<{ owner: string; repository: string }>;

export type StableRelease = Readonly<{
  tag: string;
  title: string;
  publishedAt: string;
  url: string;
  assets: readonly Readonly<{ name: string; size: number; sha256: string | null }>[];
}>;

export type AdvisorySeverity = "critical" | "high" | "moderate" | "low" | "unknown";

export type PublishedAdvisory = Readonly<{
  id: string;
  summary: string;
  severity: AdvisorySeverity;
  packages: readonly Readonly<{
    ecosystem: string;
    name: string;
    vulnerableRange: string;
    patchedVersions: string;
  }>[];
}>;

export type ReleaseReview = Readonly<{
  candidateTag: string;
  installedVersion: string | null;
  tagMatchesInstalled: boolean;
  installedVersionEvidence: "UNKNOWN" | "UNATTESTED";
  compatibility: "UNKNOWN_REQUIRES_REVIEW";
  impact: "UNCLASSIFIED_REQUIRES_REVIEW";
  advisoryEvidence: "UNAVAILABLE" | "PAYLOAD_UNVERIFIED";
  advisoryCount: number | null;
  approval: "NOT_AUTHORIZED";
  installationAllowed: false;
}>;

const RELEASE_NOTES_LIMIT = 16_000;
const MAX_ASSETS = 64;
const MAX_ADVISORIES = 500;
const MAX_PACKAGES_PER_ADVISORY = 64;

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function boundedText(value: unknown, max: number): string | null {
  if (typeof value !== "string" || value.length === 0 || value.length > max) return null;
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value)) return null;
  return value;
}

function boundedField(value: unknown, max: number): string | null {
  if (typeof value !== "string" || value.length > max) return null;
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value)) return null;
  return value;
}

function validSource(source: UpstreamSource): boolean {
  return Boolean(
    source &&
      /^[A-Za-z0-9_.-]{1,100}$/.test(source.owner) &&
      /^[A-Za-z0-9_.-]{1,100}$/.test(source.repository),
  );
}

function stableTag(value: unknown): string | null {
  const tag = boundedText(value, 128);
  return tag && /^v?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(tag) ? tag : null;
}

/** Parse one stable release object; draft, prerelease, malformed, or untrusted links fail closed. */
export function parseStableRelease(value: unknown, source: UpstreamSource): StableRelease | null {
  const release = record(value);
  if (!release || !validSource(source) || release.draft !== false || release.prerelease !== false) {
    return null;
  }

  const tag = stableTag(release.tag_name);
  const title = release.name === null ? (tag ?? null) : boundedText(release.name, 240);
  const publishedAt = boundedText(release.published_at, 40);
  const notes = typeof release.body === "string" ? release.body : "";
  if (
    !tag ||
    !title ||
    !publishedAt ||
    !publishedAt.endsWith("Z") ||
    !Number.isFinite(Date.parse(publishedAt)) ||
    notes.length > RELEASE_NOTES_LIMIT
  ) {
    return null;
  }

  const expectedUrl = `https://github.com/${source.owner}/${source.repository}/releases/tag/${encodeURIComponent(tag)}`;
  if (release.html_url !== expectedUrl) return null;

  if (!Array.isArray(release.assets) || release.assets.length > MAX_ASSETS) return null;
  const assets: { name: string; size: number; sha256: string | null }[] = [];
  const names = new Set<string>();
  for (const rawAsset of release.assets) {
    const asset = record(rawAsset);
    if (!asset) return null;
    const name = boundedText(asset.name, 120);
    const size = asset.size;
    const digest = asset.digest;
    if (
      !name ||
      name === "." ||
      name === ".." ||
      /[\\/]/.test(name) ||
      names.has(name) ||
      typeof size !== "number" ||
      !Number.isSafeInteger(size) ||
      size < 0 ||
      size > 2_000_000_000 ||
      (digest !== null &&
        digest !== undefined &&
        (typeof digest !== "string" || !/^sha256:[a-f0-9]{64}$/.test(digest)))
    ) {
      return null;
    }
    names.add(name);
    assets.push({ name, size, sha256: typeof digest === "string" ? digest.slice(7) : null });
  }

  return { tag, title, publishedAt, url: expectedUrl, assets };
}

/** Parse a bounded repository-advisory response without treating unknown severity as clean. */
export function parsePublishedAdvisories(value: unknown): readonly PublishedAdvisory[] | null {
  if (!Array.isArray(value) || value.length > MAX_ADVISORIES) return null;
  const advisories: PublishedAdvisory[] = [];
  const ids = new Set<string>();

  for (const rawAdvisory of value) {
    const advisory = record(rawAdvisory);
    if (!advisory) return null;
    const id = boundedText(advisory.ghsa_id, 32);
    const summary = boundedText(advisory.summary, 500);
    if (
      !id ||
      !/^GHSA-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(id) ||
      ids.has(id.toUpperCase()) ||
      !summary ||
      advisory.state !== "published" ||
      !Array.isArray(advisory.vulnerabilities) ||
      advisory.vulnerabilities.length > MAX_PACKAGES_PER_ADVISORY
    ) {
      return null;
    }

    const severityValue = advisory.severity;
    const severity: AdvisorySeverity =
      severityValue === "critical" ||
      severityValue === "high" ||
      severityValue === "moderate" ||
      severityValue === "low"
        ? severityValue
        : "unknown";
    const packages: {
      ecosystem: string;
      name: string;
      vulnerableRange: string;
      patchedVersions: string;
    }[] = [];
    for (const rawVulnerability of advisory.vulnerabilities) {
      const vulnerability = record(rawVulnerability);
      const pkg = vulnerability && record(vulnerability.package);
      const ecosystem = pkg && boundedText(pkg.ecosystem, 80);
      const name = pkg && boundedText(pkg.name, 160);
      const vulnerableRange = boundedField(vulnerability?.vulnerable_version_range, 240);
      const patchedVersions = boundedField(vulnerability?.patched_versions, 240);
      if (!ecosystem || !name || !vulnerableRange || !patchedVersions) return null;
      packages.push({ ecosystem, name, vulnerableRange, patchedVersions });
    }
    ids.add(id.toUpperCase());
    advisories.push({ id, summary, severity, packages });
  }

  return advisories;
}

/**
 * Summarize evidence without inferring that a tag is newer, compatible, safe,
 * approved, or installable. Installed values from a source manifest are not
 * runtime attestation.
 */
export function assessRelease(
  release: StableRelease,
  installedVersion: string | null,
  advisories: readonly PublishedAdvisory[] | null,
): ReleaseReview {
  const installed = boundedText(installedVersion, 128);
  return {
    candidateTag: release.tag,
    installedVersion: installed,
    tagMatchesInstalled: installed !== null && release.tag === installed,
    installedVersionEvidence: installed === null ? "UNKNOWN" : "UNATTESTED",
    compatibility: "UNKNOWN_REQUIRES_REVIEW",
    impact: "UNCLASSIFIED_REQUIRES_REVIEW",
    advisoryEvidence: advisories === null ? "UNAVAILABLE" : "PAYLOAD_UNVERIFIED",
    advisoryCount: advisories?.length ?? null,
    approval: "NOT_AUTHORIZED",
    installationAllowed: false,
  };
}
