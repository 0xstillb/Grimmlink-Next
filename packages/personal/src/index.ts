export const personalWriteCapability = Object.freeze({
  rating: false,
  bookmarks: false,
  annotations: false,
  sessionOutboxTransmit: false,
  resetProgress: false,
} as const);
export function assertPersonalWriteAuthorized(): never {
  throw new Error("Personal writes require Phase07 row-level authorization");
}
