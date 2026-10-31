import type { FastifyInstance, FastifyRequest } from "fastify";

const GITHUB_API_ORIGIN = "https://api.github.com";
const GITHUB_API_VERSION = "2026-03-10";
const MAX_RESPONSE_BYTES = 1_048_576;
const MAX_RELEASE_NOTES = 16_000;
const MAX_ASSETS = 64;
const ADVISORIES_PER_PAGE = 100;
const MAX_ADVISORIES = 500;
const MAX_ADVISORY_PAGES = MAX_ADVISORIES / ADVISORIES_PER_PAGE;
const PROBE_PAGE = MAX_ADVISORY_PAGES + 1;
const MAX_PACKAGES_PER_ADVISORY = 64;

export type UpdateFeedSource = Readonly<{
  id: string;
  owner: string;
  repository: string;
}>;

export type SafeUpdateRelease = Readonly<{
  tag: string;
  title: string;
  publishedAt: string;
  url: string;
  assets: readonly Readonly<{ name: string; size: number; sha256: string | null }>[];
}>;

export type SafeUpdateAdvisory = Readonly<{
  id: string;
  summary: string;
  severity: "critical" | "high" | "moderate" | "low" | "unknown";
  packages: readonly Readonly<{
    ecosystem: string;
    name: string;
    vulnerableRange: string;
    patchedVersions: string;
  }>[];
}>;

export type UpdateFeedSnapshot = Readonly<{
  sourceId: string;
  fetchedAt: string;
  release: SafeUpdateRelease;
  advisories: readonly SafeUpdateAdvisory[];
  sourceEvidence: "PUBLIC_GITHUB_PAYLOAD_UNVERIFIED";
  compatibility: "UNKNOWN_REQUIRES_REVIEW";
  impact: "UNCLASSIFIED_REQUIRES_REVIEW";
  approval: "NOT_AUTHORIZED";
  installationAllowed: false;
}>;

export type UpdateFeedErrorCode =
  | "UNKNOWN_SOURCE"
  | "REQUEST_ABORTED"
  | "REQUEST_TIMEOUT"
  | "FEED_UNAVAILABLE"
  | "RESPONSE_INVALID"
  | "RESPONSE_TOO_LARGE";

export class UpdateFeedError extends Error {
  constructor(readonly code: UpdateFeedErrorCode) {
    super(code);
    this.name = "UpdateFeedError";
  }
}

type ResponseBody = AsyncIterable<Uint8Array> & {
  [Symbol.asyncIterator](): AsyncIterator<Uint8Array>;
};

export type UpdateFeedResponse = Readonly<{
  status: number;
  headers: Readonly<{ get: (name: string) => string | null }>;
  body: ResponseBody | null;
}>;

export type UpdateFeedFetchInit = Readonly<{
  method: "GET";
  headers: Readonly<Record<string, string>>;
  redirect: "error";
  credentials: "omit";
  cache: "no-store";
  signal: AbortSignal;
}>;

export type UpdateFeedFetch = (
  url: string,
  init: UpdateFeedFetchInit,
) => Promise<UpdateFeedResponse>;

export type UpdateFeedReader = Readonly<{
  read: (sourceId: string, signal?: AbortSignal) => Promise<UpdateFeedSnapshot>;
  sourceIds: readonly string[];
}>;

type FeedReaderOptions = Readonly<{
  sources: readonly UpdateFeedSource[];
  fetch?: UpdateFeedFetch;
  timeoutMs?: number;
  now?: () => Date;
}>;

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function boundedText(value: unknown, max: number, allowEmpty = false): string | null {
  if (
    typeof value !== "string" ||
    (!allowEmpty && value.length === 0) ||
    value.length > max ||
    /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value)
  ) {
    return null;
  }
  return value;
}

function validSource(source: UpdateFeedSource): boolean {
  return (
    /^[a-z][a-z0-9-]{0,31}$/.test(source.id) &&
    /^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/.test(source.owner) &&
    /^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/.test(source.repository)
  );
}

function safeTag(value: unknown): string | null {
  const tag = boundedText(value, 128);
  return tag && /^v?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(tag) ? tag : null;
}

function parseRelease(value: unknown, source: UpdateFeedSource): SafeUpdateRelease | null {
  const release = record(value);
  if (!release || release.draft !== false || release.prerelease !== false) return null;
  const tag = safeTag(release.tag_name);
  const title = release.name === null ? (tag ?? null) : boundedText(release.name, 240);
  const publishedAt = boundedText(release.published_at, 40);
  const notes = typeof release.body === "string" ? release.body : "";
  if (
    !tag ||
    !title ||
    !publishedAt ||
    !publishedAt.endsWith("Z") ||
    !Number.isFinite(Date.parse(publishedAt)) ||
    notes.length > MAX_RELEASE_NOTES ||
    !Array.isArray(release.assets) ||
    release.assets.length > MAX_ASSETS
  ) {
    return null;
  }

  const url = `https://github.com/${source.owner}/${source.repository}/releases/tag/${encodeURIComponent(tag)}`;
  if (release.html_url !== url) return null;

  const assets: { name: string; size: number; sha256: string | null }[] = [];
  const names = new Set<string>();
  for (const raw of release.assets) {
    const asset = record(raw);
    const name = asset && boundedText(asset.name, 120);
    const size = asset?.size;
    const digest = asset?.digest;
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
  return { tag, title, publishedAt, url, assets };
}

function parseAdvisoryPage(value: unknown): readonly SafeUpdateAdvisory[] | null {
  if (!Array.isArray(value) || value.length > ADVISORIES_PER_PAGE) return null;
  const parsed: SafeUpdateAdvisory[] = [];
  const ids = new Set<string>();
  for (const raw of value) {
    const advisory = record(raw);
    const id = advisory && boundedText(advisory.ghsa_id, 32);
    const summary = advisory && boundedText(advisory.summary, 500);
    if (
      !advisory ||
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
    const severity = advisory.severity;
    const safeSeverity =
      severity === "critical" ||
      severity === "high" ||
      severity === "moderate" ||
      severity === "low"
        ? severity
        : "unknown";
    const packages: {
      ecosystem: string;
      name: string;
      vulnerableRange: string;
      patchedVersions: string;
    }[] = [];
    for (const item of advisory.vulnerabilities) {
      const vulnerability = record(item);
      const pkg = vulnerability && record(vulnerability.package);
      const ecosystem = pkg && boundedText(pkg.ecosystem, 80);
      const name = pkg && boundedText(pkg.name, 160);
      const vulnerableRange = boundedText(vulnerability?.vulnerable_version_range, 240, true);
      const patchedVersions = boundedText(vulnerability?.patched_versions, 240, true);
      if (!ecosystem || !name || vulnerableRange === null || patchedVersions === null) {
        return null;
      }
      packages.push({ ecosystem, name, vulnerableRange, patchedVersions });
    }
    ids.add(id.toUpperCase());
    parsed.push({ id, summary, severity: safeSeverity, packages });
  }
  return parsed;
}

async function readBoundedJson(response: UpdateFeedResponse): Promise<unknown> {
  const contentType = response.headers.get("content-type");
  if (!contentType || !/^application\/(?:json|vnd\.github\+json)(?:\s*;|$)/i.test(contentType)) {
    await discardBody(response);
    throw new UpdateFeedError("RESPONSE_INVALID");
  }
  const declaredLength = response.headers.get("content-length");
  if (
    declaredLength !== null &&
    (!/^\d+$/.test(declaredLength) || Number(declaredLength) > MAX_RESPONSE_BYTES)
  ) {
    await discardBody(response);
    throw new UpdateFeedError("RESPONSE_TOO_LARGE");
  }
  if (!response.body) throw new UpdateFeedError("RESPONSE_INVALID");

  const chunks: Uint8Array[] = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.byteLength;
    if (size > MAX_RESPONSE_BYTES) throw new UpdateFeedError("RESPONSE_TOO_LARGE");
    chunks.push(chunk);
  }
  try {
    const bytes = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
  } catch {
    throw new UpdateFeedError("RESPONSE_INVALID");
  }
}

async function discardBody(response: UpdateFeedResponse): Promise<void> {
  try {
    await response.body?.[Symbol.asyncIterator]().return?.();
  } catch {
    // Never surface upstream body content or disposal errors.
  }
}

function apiUrl(
  source: UpdateFeedSource,
  resource: "releases/latest" | "security/advisories",
  page?: number,
): string {
  const url = new URL(
    `/repos/${encodeURIComponent(source.owner)}/${encodeURIComponent(source.repository)}/${resource}`,
    GITHUB_API_ORIGIN,
  );
  if (resource === "security/advisories") {
    url.searchParams.set("state", "published");
    url.searchParams.set("per_page", String(ADVISORIES_PER_PAGE));
    if (page !== undefined) url.searchParams.set("page", String(page));
  }
  return url.href;
}

function defaultFetch(): UpdateFeedFetch {
  const implementation = (globalThis as unknown as { fetch?: UpdateFeedFetch }).fetch;
  if (!implementation) throw new UpdateFeedError("FEED_UNAVAILABLE");
  return implementation.bind(globalThis);
}

/**
 * Read-only, bounded GitHub feed client. Source IDs map to configured repo slugs;
 * callers cannot provide a URL or host. This client does not download assets,
 * infer compatibility, approve, install, persist or authorize a release.
 */
export function createGitHubUpdateFeedReader(options: FeedReaderOptions): UpdateFeedReader {
  const timeoutMs = options.timeoutMs ?? 5_000;
  if (
    options.sources.length === 0 ||
    options.sources.length > 32 ||
    !Number.isSafeInteger(timeoutMs) ||
    timeoutMs < 100 ||
    timeoutMs > 15_000
  ) {
    throw new UpdateFeedError("RESPONSE_INVALID");
  }
  const sources = new Map<string, UpdateFeedSource>();
  for (const source of options.sources) {
    if (!validSource(source) || sources.has(source.id))
      throw new UpdateFeedError("RESPONSE_INVALID");
    sources.set(source.id, Object.freeze({ ...source }));
  }
  const fetcher = options.fetch ?? defaultFetch();
  const now = options.now ?? (() => new Date());

  const getJson = async (url: string, signal: AbortSignal): Promise<unknown> => {
    const parsedUrl = new URL(url);
    if (
      parsedUrl.protocol !== "https:" ||
      parsedUrl.origin !== GITHUB_API_ORIGIN ||
      parsedUrl.username !== "" ||
      parsedUrl.password !== ""
    ) {
      throw new UpdateFeedError("RESPONSE_INVALID");
    }
    let response: UpdateFeedResponse;
    try {
      response = await fetcher(parsedUrl.href, {
        method: "GET",
        headers: {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": GITHUB_API_VERSION,
        },
        redirect: "error",
        credentials: "omit",
        cache: "no-store",
        signal,
      });
    } catch {
      throw new UpdateFeedError(signal.aborted ? "REQUEST_ABORTED" : "FEED_UNAVAILABLE");
    }
    if (response.status !== 200) {
      await discardBody(response);
      throw new UpdateFeedError("FEED_UNAVAILABLE");
    }
    return await readBoundedJson(response);
  };

  return Object.freeze({
    sourceIds: Object.freeze([...sources.keys()]),
    async read(sourceId: string, externalSignal?: AbortSignal): Promise<UpdateFeedSnapshot> {
      const source = sources.get(sourceId);
      if (!source) throw new UpdateFeedError("UNKNOWN_SOURCE");
      if (externalSignal?.aborted) throw new UpdateFeedError("REQUEST_ABORTED");

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      const abortExternal = () => controller.abort();
      externalSignal?.addEventListener("abort", abortExternal, { once: true });
      try {
        const releaseValue = await getJson(apiUrl(source, "releases/latest"), controller.signal);
        const release = parseRelease(releaseValue, source);
        if (!release) throw new UpdateFeedError("RESPONSE_INVALID");

        const advisories: SafeUpdateAdvisory[] = [];
        for (let page = 1; page <= PROBE_PAGE; page += 1) {
          const value = await getJson(
            apiUrl(source, "security/advisories", page),
            controller.signal,
          );
          const parsed = parseAdvisoryPage(value);
          if (!parsed) throw new UpdateFeedError("RESPONSE_INVALID");
          if (page === PROBE_PAGE) {
            if (parsed.length > 0) throw new UpdateFeedError("RESPONSE_TOO_LARGE");
            break;
          }
          if (advisories.length + parsed.length > MAX_ADVISORIES) {
            throw new UpdateFeedError("RESPONSE_TOO_LARGE");
          }
          const seen = new Set(advisories.map((item) => item.id.toUpperCase()));
          if (parsed.some((item) => seen.has(item.id.toUpperCase())))
            throw new UpdateFeedError("RESPONSE_INVALID");
          advisories.push(...parsed);
          if (parsed.length < ADVISORIES_PER_PAGE) break;
        }

        const capturedAt = now();
        if (!Number.isFinite(capturedAt.getTime())) throw new UpdateFeedError("RESPONSE_INVALID");
        const fetchedAt = capturedAt.toISOString();
        return Object.freeze({
          sourceId,
          fetchedAt,
          release,
          advisories: Object.freeze(advisories),
          sourceEvidence: "PUBLIC_GITHUB_PAYLOAD_UNVERIFIED",
          compatibility: "UNKNOWN_REQUIRES_REVIEW",
          impact: "UNCLASSIFIED_REQUIRES_REVIEW",
          approval: "NOT_AUTHORIZED",
          installationAllowed: false,
        });
      } catch (error) {
        if (controller.signal.aborted) {
          throw new UpdateFeedError(
            externalSignal?.aborted ? "REQUEST_ABORTED" : "REQUEST_TIMEOUT",
          );
        }
        if (error instanceof UpdateFeedError) throw error;
        throw new UpdateFeedError("FEED_UNAVAILABLE");
      } finally {
        clearTimeout(timeout);
        externalSignal?.removeEventListener("abort", abortExternal);
      }
    },
  });
}

export type IsolatedUpdateFeedRouteSource = Readonly<{
  authorizeOwner: (request: FastifyRequest) => Promise<boolean>;
  reader: UpdateFeedReader;
}>;

/**
 * Isolated route factory only. It is deliberately not registered by server.ts:
 * the production session resolver and egress policy must be wired first.
 */
export function registerIsolatedUpdateFeedRoutes(
  server: FastifyInstance,
  source: IsolatedUpdateFeedRouteSource,
): void {
  const ownerOnly = async (
    request: FastifyRequest,
    reply: { code: (status: number) => { send: (body: object) => void } },
  ) => {
    if (!(await source.authorizeOwner(request)))
      return reply.code(403).send({ error: "OWNER_AUTH_REQUIRED" });
  };
  server.get<{ Params: { source: string } }>(
    "/api/grimmlink/v2/local/updates/:source",
    { preHandler: ownerOnly },
    async (request, reply) => {
      if (!/^[a-z][a-z0-9-]{0,31}$/.test(request.params.source))
        return reply.code(404).send({ error: "UPDATE_SOURCE_NOT_FOUND" });
      try {
        const snapshot = await source.reader.read(request.params.source);
        return reply
          .header("cache-control", "no-store")
          .header("x-content-type-options", "nosniff")
          .send({ snapshot });
      } catch (error) {
        const code = error instanceof UpdateFeedError ? error.code : "FEED_UNAVAILABLE";
        const status = code === "UNKNOWN_SOURCE" ? 404 : code === "REQUEST_TIMEOUT" ? 504 : 502;
        return reply
          .code(status)
          .header("cache-control", "no-store")
          .send({
            error: status === 404 ? "UPDATE_SOURCE_NOT_FOUND" : "UPDATE_FEED_UNAVAILABLE",
          });
      }
    },
  );
}
