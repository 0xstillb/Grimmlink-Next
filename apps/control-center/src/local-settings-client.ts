import { DiagnosticsClientError } from "./diagnostics-client.js";

const SETTINGS_PATH = "/api/grimmlink/v2/local/settings/status";
const MAX_RESPONSE_BYTES = 8 * 1024;

export type LocalSecurityPolicy = Readonly<{
  source: "CODE_ENFORCED_FAIL_CLOSED_POLICY";
  mode: "SINGLE_OWNER_PRIVATE";
  officialForwarding: "DENY_ALL";
  protectedWrites: "OFF";
  nativeKosync: "OFF";
  personalBridge: "OFF";
  sessionBridge: "OFF";
  resetProgress: "OFF";
  managedProjection: "OFF";
  automaticUpdates: "OFF";
  production: "NOT_AUTHORIZED";
}>;

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return keys.length === wanted.length && keys.every((key, index) => key === wanted[index]);
}

async function boundedText(response: Response): Promise<string> {
  if (!response.body) throw new Error("LOCAL_SETTINGS_RESPONSE_INVALID");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      bytes += next.value.byteLength;
      if (bytes > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new Error("LOCAL_SETTINGS_RESPONSE_TOO_LARGE");
      }
      text += decoder.decode(next.value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

function parsePolicy(value: unknown): LocalSecurityPolicy {
  if (
    !record(value) ||
    !exactKeys(value, [
      "source",
      "mode",
      "officialForwarding",
      "protectedWrites",
      "nativeKosync",
      "personalBridge",
      "sessionBridge",
      "resetProgress",
      "managedProjection",
      "automaticUpdates",
      "production",
    ]) ||
    value.source !== "CODE_ENFORCED_FAIL_CLOSED_POLICY" ||
    value.mode !== "SINGLE_OWNER_PRIVATE" ||
    value.officialForwarding !== "DENY_ALL" ||
    value.protectedWrites !== "OFF" ||
    value.nativeKosync !== "OFF" ||
    value.personalBridge !== "OFF" ||
    value.sessionBridge !== "OFF" ||
    value.resetProgress !== "OFF" ||
    value.managedProjection !== "OFF" ||
    value.automaticUpdates !== "OFF" ||
    value.production !== "NOT_AUTHORIZED"
  ) {
    throw new Error("LOCAL_SETTINGS_RESPONSE_INVALID");
  }
  return value as unknown as LocalSecurityPolicy;
}

export async function fetchLocalSecurityPolicy(signal?: AbortSignal): Promise<LocalSecurityPolicy> {
  const response = await fetch(SETTINGS_PATH, {
    method: "GET",
    credentials: "same-origin",
    mode: "same-origin",
    redirect: "error",
    cache: "no-store",
    headers: { Accept: "application/json" },
    ...(signal === undefined ? {} : { signal }),
  });
  if (!response.ok) throw new DiagnosticsClientError(response.status);
  if (!response.headers.get("content-type")?.includes("application/json")) {
    throw new Error("LOCAL_SETTINGS_RESPONSE_INVALID");
  }
  try {
    return parsePolicy(JSON.parse(await boundedText(response)) as unknown);
  } catch {
    throw new Error("LOCAL_SETTINGS_RESPONSE_INVALID");
  }
}
