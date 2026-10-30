/** Phase08 allow-listed read-only LOCAL status. Never accept diagnostic text or secrets from a remote payload. */
export type LocalSnapshot = Readonly<{
  observed: boolean;
  adapter: "UNREACHABLE" | "MOCK_ONLY";
  official: "DISCONNECTED";
  gateway: "DENY_ALL";
  personal: "OFF";
  nativeKosync: "OFF";
  release: "NOT_AUTHORIZED";
  adapterVersion: string | null;
  phase: string | null;
}>;

export const DISCONNECTED: LocalSnapshot = Object.freeze({
  observed: false,
  adapter: "UNREACHABLE",
  official: "DISCONNECTED",
  gateway: "DENY_ALL",
  personal: "OFF",
  nativeKosync: "OFF",
  release: "NOT_AUTHORIZED",
  adapterVersion: null,
  phase: null,
});

function obj(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** Fail closed on malformed or unexpected local contracts. No unknown server fields are retained. */
export function parseLocalSnapshot(
  healthValue: unknown,
  capsValue: unknown,
  versionValue: unknown,
): LocalSnapshot {
  const health = obj(healthValue);
  const caps = obj(capsValue);
  const version = obj(versionValue);
  if (
    !health ||
    !caps ||
    !version ||
    health.status !== "foundation-only" ||
    health.upstreamConnected !== false ||
    caps.officialConnected !== false ||
    caps.gatewayForwarding !== "DENY_ALL" ||
    caps.personalBridge !== "OFF" ||
    caps.nativeKosyncProgress !== "OFF" ||
    version.mode !== "MOCK_ONLY" ||
    version.officialConnected !== false ||
    version.releaseAuthorization !== "NOT_AUTHORIZED" ||
    typeof version.adapterVersion !== "string" ||
    !/^[0-9]+\.[0-9]+\.[0-9]+$/.test(version.adapterVersion) ||
    typeof version.phase !== "string" ||
    !/^[0-9]{2}$/.test(version.phase)
  ) {
    return DISCONNECTED;
  }
  return {
    observed: true,
    adapter: "MOCK_ONLY",
    official: "DISCONNECTED",
    gateway: "DENY_ALL",
    personal: "OFF",
    nativeKosync: "OFF",
    release: "NOT_AUTHORIZED",
    adapterVersion: version.adapterVersion,
    phase: version.phase,
  };
}

async function getJson(path: string, signal: AbortSignal): Promise<unknown> {
  const result = await fetch(path, {
    method: "GET",
    credentials: "same-origin",
    mode: "same-origin",
    redirect: "error",
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal,
  });
  if (!result.ok || !result.headers.get("content-type")?.includes("application/json")) {
    throw new Error("LOCAL_CONTRACT_UNAVAILABLE");
  }
  const length = Number(result.headers.get("content-length"));
  if (Number.isFinite(length) && length > 4096) throw new Error("LOCAL_RESPONSE_TOO_LARGE");
  const body = await result.text();
  if (body.length > 4096) throw new Error("LOCAL_RESPONSE_TOO_LARGE");
  return JSON.parse(body) as unknown;
}

/** Same-origin local GET only; does not probe Official/NAS/readers or mutate anything. */
export async function inspectLocalAdapter(signal: AbortSignal): Promise<LocalSnapshot> {
  try {
    const [health, caps, version] = await Promise.all([
      getJson("/health", signal),
      getJson("/api/grimmlink/v2/capabilities", signal),
      getJson("/api/grimmlink/v2/version", signal),
    ]);
    return parseLocalSnapshot(health, caps, version);
  } catch {
    return DISCONNECTED;
  }
}

/** Secret-safe export, formed ONLY from allow-listed values; no logs, credentials, identifiers or notes. */
export function safeDiagnosticExport(snapshot: LocalSnapshot): string {
  return JSON.stringify(
    {
      schema: "grimmlink.phase08.diagnostics.v1",
      source: "local-allowlisted",
      liveOfficialTested: false,
      phase09Required: true,
      adapter: snapshot.adapter,
      observed: snapshot.observed,
      official: snapshot.official,
      gateway: snapshot.gateway,
      personal: snapshot.personal,
      nativeKosync: snapshot.nativeKosync,
      release: snapshot.release,
      adapterVersion: snapshot.adapterVersion,
      phase: snapshot.phase,
    },
    null,
    2,
  );
}
