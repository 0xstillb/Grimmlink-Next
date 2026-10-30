/**
 * Phase05 offline-only KOSync wire classifier. No network transport is ever
 * created here. Native Official passthrough remains blocked by ADR-025.
 */
export type KoWireRoute = "AUTH_MOCK" | "PROGRESS_GET_MOCK" | "PROGRESS_PUT_MOCK" | "DENY";

const validDocument = (value: string): boolean => /^[0-9a-f]{32}$/.test(value);

export function classifyMockKOSyncRequest(
  method: string,
  rawTarget: string,
): Readonly<{ route: KoWireRoute; document: string | null }> {
  const deny = { route: "DENY" as const, document: null };
  if (
    !/^(GET|PUT)$/.test(method) ||
    rawTarget.length > 200 ||
    !rawTarget.startsWith("/") ||
    rawTarget.includes("?") ||
    rawTarget.includes("#") ||
    rawTarget.includes("%") ||
    rawTarget.includes("//") ||
    rawTarget.includes("\\") ||
    rawTarget.split("/").some((segment) => segment === "." || segment === "..")
  )
    return deny;
  if (method === "GET" && rawTarget === "/users/auth")
    return { route: "AUTH_MOCK", document: null };
  if (method === "PUT" && rawTarget === "/syncs/progress")
    return { route: "PROGRESS_PUT_MOCK", document: null };
  const match = /^\/syncs\/progress\/([0-9a-f]{32})$/.exec(rawTarget);
  if (method === "GET" && match && match[1])
    return { route: "PROGRESS_GET_MOCK", document: match[1] };
  return deny;
}

export type KoPositionWire = Readonly<{
  document: string;
  progress: string;
  percentage: number | null;
  device: string | null;
  device_id: string | null;
}>;

/** Parse a narrowly bounded mock client payload without synthesizing progress. */
export function normalizeMockKOSyncPut(payload: unknown): KoPositionWire {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("KOSYNC_BODY_INVALID");
  }
  const item = payload as Record<string, unknown>;
  if (
    typeof item.document !== "string" ||
    !validDocument(item.document) ||
    typeof item.progress !== "string" ||
    item.progress.length === 0 ||
    item.progress.length > 4096 ||
    item.progress.includes("\0")
  )
    throw new Error("KOSYNC_BODY_INVALID");
  if (
    item.percentage !== undefined &&
    (typeof item.percentage !== "number" ||
      !Number.isFinite(item.percentage) ||
      item.percentage < 0 ||
      item.percentage > 1)
  )
    throw new Error("KOSYNC_PERCENT_UNVERIFIED");
  const device = item.device;
  const deviceId = item.device_id;
  if (
    (device !== undefined && (typeof device !== "string" || device.length > 128)) ||
    (deviceId !== undefined && (typeof deviceId !== "string" || deviceId.length > 128))
  )
    throw new Error("KOSYNC_DEVICE_INVALID");
  return {
    document: item.document,
    progress: item.progress,
    percentage: typeof item.percentage === "number" ? item.percentage : null,
    device: typeof device === "string" ? device : null,
    device_id: typeof deviceId === "string" ? deviceId : null,
  };
}

/** No cross-client feature claims without tested, documented device adapters. */
export const phase05DeviceCapabilities = Object.freeze({
  KOREADER: { progress: "MOCK_CONTRACT_ONLY", bookmarks: "UNSUPPORTED", rating: "UNSUPPORTED" },
  READEST: { progress: "MOCK_CONTRACT_ONLY", bookmarks: "UNSUPPORTED", rating: "UNSUPPORTED" },
  CROSSPOINT_TH: { progress: "UNVERIFIED", bookmarks: "UNSUPPORTED", rating: "UNSUPPORTED" },
} as const);

export function assertNativeKOSyncDisabled(): never {
  throw new Error("NATIVE_KOSYNC_PROGRESS_BLOCKED_ATOMICITY");
}
