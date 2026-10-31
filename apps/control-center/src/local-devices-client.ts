import { DiagnosticsClientError } from "./diagnostics-client.js";

const DEVICES_PATH = "/api/grimmlink/v2/local/devices";
const DEVICE_ID = /^[A-Za-z0-9_-]{1,128}$/;
const TOKEN = /^[A-Za-z0-9_-]{43}$/;
const CSRF = /^[A-Za-z0-9_-]{32,128}$/;
const MAX_RESPONSE_BYTES = 32 * 1024;

export type LocalReaderDevice = Readonly<{
  deviceId: string;
  generation: number;
  expiresAtMs: number;
  revokedAtMs: number | null;
  state: "ACTIVE" | "EXPIRED" | "REVOKED";
}>;

export type LocalDeviceSnapshot = Readonly<{
  source: "LOCAL_SQLITE_OFFLINE";
  devices: readonly LocalReaderDevice[];
  officialWrites: "OFF";
}>;

export type LocalDeviceToken = Readonly<{
  deviceId: string;
  token: string;
  generation: number;
  expiresAtMs: number;
  delivery: "OFFLINE_TOKEN_SHOWN_ONCE";
}>;

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}

async function boundedText(response: Response): Promise<string> {
  if (!response.body) throw new Error("LOCAL_DEVICES_RESPONSE_INVALID");
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
        throw new Error("LOCAL_DEVICES_RESPONSE_TOO_LARGE");
      }
      text += decoder.decode(next.value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

async function request(
  path: string,
  options: {
    method?: "GET" | "POST";
    body?: unknown;
    csrfToken?: string;
    signal?: AbortSignal;
  } = {},
): Promise<unknown> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.csrfToken !== undefined) {
    if (!CSRF.test(options.csrfToken)) throw new Error("LOCAL_DEVICES_CSRF_INVALID");
    headers["x-csrf-token"] = options.csrfToken;
  }
  const response = await fetch(path, {
    method: options.method ?? "GET",
    credentials: "same-origin",
    mode: "same-origin",
    redirect: "error",
    cache: "no-store",
    headers,
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    ...(options.signal === undefined ? {} : { signal: options.signal }),
  });
  if (!response.ok) throw new DiagnosticsClientError(response.status);
  if (response.status === 204) return null;
  if (!response.headers.get("content-type")?.includes("application/json"))
    throw new Error("LOCAL_DEVICES_RESPONSE_INVALID");
  try {
    return JSON.parse(await boundedText(response)) as unknown;
  } catch {
    throw new Error("LOCAL_DEVICES_RESPONSE_INVALID");
  }
}

function parseDevice(value: unknown): LocalReaderDevice {
  if (
    !record(value) ||
    !exactKeys(value, ["deviceId", "generation", "expiresAtMs", "revokedAtMs", "state"]) ||
    typeof value.deviceId !== "string" ||
    !DEVICE_ID.test(value.deviceId) ||
    typeof value.generation !== "number" ||
    !Number.isSafeInteger(value.generation) ||
    value.generation < 1 ||
    typeof value.expiresAtMs !== "number" ||
    !Number.isSafeInteger(value.expiresAtMs) ||
    value.expiresAtMs < 0 ||
    (value.revokedAtMs !== null &&
      (typeof value.revokedAtMs !== "number" ||
        !Number.isSafeInteger(value.revokedAtMs) ||
        value.revokedAtMs < 0)) ||
    !["ACTIVE", "EXPIRED", "REVOKED"].includes(String(value.state))
  ) {
    throw new Error("LOCAL_DEVICES_RESPONSE_INVALID");
  }
  if ((value.state === "REVOKED") !== (value.revokedAtMs !== null))
    throw new Error("LOCAL_DEVICES_RESPONSE_INVALID");
  return value as unknown as LocalReaderDevice;
}

function parseToken(value: unknown): LocalDeviceToken {
  if (
    !record(value) ||
    !exactKeys(value, ["deviceId", "token", "generation", "expiresAtMs", "delivery"]) ||
    typeof value.deviceId !== "string" ||
    !DEVICE_ID.test(value.deviceId) ||
    typeof value.token !== "string" ||
    !TOKEN.test(value.token) ||
    typeof value.generation !== "number" ||
    !Number.isSafeInteger(value.generation) ||
    value.generation < 1 ||
    typeof value.expiresAtMs !== "number" ||
    !Number.isSafeInteger(value.expiresAtMs) ||
    value.expiresAtMs < 0 ||
    value.delivery !== "OFFLINE_TOKEN_SHOWN_ONCE"
  ) {
    throw new Error("LOCAL_DEVICES_RESPONSE_INVALID");
  }
  return value as unknown as LocalDeviceToken;
}

export async function fetchLocalDevices(signal?: AbortSignal): Promise<LocalDeviceSnapshot> {
  const value = await request(DEVICES_PATH, signal === undefined ? {} : { signal });
  if (
    !record(value) ||
    !exactKeys(value, ["source", "devices", "officialWrites"]) ||
    value.source !== "LOCAL_SQLITE_OFFLINE" ||
    !Array.isArray(value.devices) ||
    value.devices.length > 100 ||
    value.officialWrites !== "OFF"
  ) {
    throw new Error("LOCAL_DEVICES_RESPONSE_INVALID");
  }
  const devices = value.devices.map(parseDevice);
  if (new Set(devices.map((device) => device.deviceId)).size !== devices.length)
    throw new Error("LOCAL_DEVICES_RESPONSE_INVALID");
  return { source: "LOCAL_SQLITE_OFFLINE", devices, officialWrites: "OFF" };
}

export async function createLocalDevicePairing(
  deviceId: string,
  expiresInDays: number,
  csrfToken: string,
): Promise<LocalDeviceToken> {
  if (
    !DEVICE_ID.test(deviceId) ||
    !Number.isSafeInteger(expiresInDays) ||
    expiresInDays < 1 ||
    expiresInDays > 90
  )
    throw new Error("LOCAL_DEVICE_INPUT_INVALID");
  return parseToken(
    await request(DEVICES_PATH, {
      method: "POST",
      body: { deviceId, expiresInDays },
      csrfToken,
    }),
  );
}

export async function revokeLocalDevice(deviceId: string, csrfToken: string): Promise<void> {
  if (!DEVICE_ID.test(deviceId)) throw new Error("LOCAL_DEVICE_ID_INVALID");
  await request(`${DEVICES_PATH}/${deviceId}/revoke`, {
    method: "POST",
    body: {},
    csrfToken,
  });
}

export async function rotateLocalDevice(
  deviceId: string,
  expiresInDays: number,
  csrfToken: string,
): Promise<LocalDeviceToken> {
  if (
    !DEVICE_ID.test(deviceId) ||
    !Number.isSafeInteger(expiresInDays) ||
    expiresInDays < 1 ||
    expiresInDays > 90
  )
    throw new Error("LOCAL_DEVICE_INPUT_INVALID");
  return parseToken(
    await request(`${DEVICES_PATH}/${deviceId}/rotate`, {
      method: "POST",
      body: { expiresInDays },
      csrfToken,
    }),
  );
}
