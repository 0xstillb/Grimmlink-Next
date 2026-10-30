export const syncCapability = Object.freeze({
  nativeKOSyncProgress: false,
  managedProgressProjection: false,
  positionBridge: false,
  readingSessionsBridge: false,
} as const);
export function assertSyncCapabilityEnabled(): never {
  throw new Error("Sync transport disabled until downstream security gates");
}
export * from "./phase05.js";
export * from "./phase06.js";
export * from "./epub-position.js";
