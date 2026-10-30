import { expect, it } from "vitest";
import {
  assertNativeKOSyncDisabled,
  classifyMockKOSyncRequest,
  normalizeMockKOSyncPut,
  phase05DeviceCapabilities,
} from "./phase05.js";

const hash = "a".repeat(32);

it("only classifies exact, canonical mock KOSync routes", () => {
  expect(classifyMockKOSyncRequest("GET", "/users/auth").route).toBe("AUTH_MOCK");
  expect(classifyMockKOSyncRequest("PUT", "/syncs/progress").route).toBe("PROGRESS_PUT_MOCK");
  expect(classifyMockKOSyncRequest("GET", "/syncs/progress/" + hash)).toEqual({
    route: "PROGRESS_GET_MOCK", document: hash,
  });
  for (const bad of [
    "/syncs/progress/" + "x".repeat(32),
    "//syncs/progress/" + hash,
    "/syncs/progress/%2e%2e",
    "/syncs/progress/" + hash + "?token=secret",
    "/api/koreader/syncs/progress/" + hash,
    "/syncs/progress/../users/auth",
  ]) {
    expect(classifyMockKOSyncRequest("GET", bad).route).toBe("DENY");
  }
  expect(classifyMockKOSyncRequest("POST", "/users/auth").route).toBe("DENY");
  expect(classifyMockKOSyncRequest("PUT", "/syncs/progress/" + hash).route).toBe("DENY");
});
it("preserves opaque position, never invents coordinates or trusts illegal percentages", () => {
  const position = "xpointer(/html/body/div[1])";
  expect(normalizeMockKOSyncPut({
    document: hash,
    progress: position,
    percentage: 0.7,
    device: "KOReader",
    device_id: "sample",
    timestamp: 99999999,
  })).toEqual({
    document: hash, progress: position, percentage: 0.7,
    device: "KOReader", device_id: "sample",
  });
  expect(() => normalizeMockKOSyncPut({
    document: hash, progress: position, percentage: 80,
  })).toThrow("KOSYNC_PERCENT_UNVERIFIED");
  expect(() => normalizeMockKOSyncPut({ document: hash, progress: "" })).toThrow();
  expect(assertNativeKOSyncDisabled).toThrow("NATIVE_KOSYNC_PROGRESS_BLOCKED_ATOMICITY");
  expect(phase05DeviceCapabilities.CROSSPOINT_TH.progress).toBe("UNVERIFIED");
});
