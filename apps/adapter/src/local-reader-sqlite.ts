import {
  initializeOfflineOwner,
  listAuthenticatedPhase07Files,
  previewOfflinePhase07Shelf,
  readOfflinePhase07Personal,
  recordOfflinePhase07Personal,
  recordOfflinePhase07Session,
  registerAuthenticatedPhase07File,
  verifyOfflineReader,
  type LocalStore,
  type OfflineOwner,
  type Phase07File,
} from "@grimmlink/persistence";
import type { FastifyRequest } from "fastify";
import type { LocalReaderRouteSource, ReaderFile, ReaderPrincipal } from "./local-reader-routes.js";
import type { OwnerAuthenticator } from "./auth/owner-auth.js";

const owner: OfflineOwner = Object.freeze({
  kind: "authenticated-local-owner",
  accountId: "owner",
});
const validId = (value: string): boolean => /^[A-Za-z0-9_-]{1,128}$/.test(value);
const validSha256 = (value: string): boolean => /^[a-f0-9]{64}$/.test(value);

/** Staging-local event persistence. No Official client or network forwarding exists. */
export function createLocalReaderRouteSource(
  store: LocalStore,
  ownerAuth: OwnerAuthenticator,
  now: () => number = Date.now,
): LocalReaderRouteSource {
  initializeOfflineOwner(store.sqlite, owner);
  const fileFor = (fileId: string, editionSha256: string): Phase07File => {
    if (!validId(fileId) || !validSha256(editionSha256)) throw new Error("READER_FILE_INVALID");
    const file = listAuthenticatedPhase07Files(store.sqlite, owner).find(
      (item) => item.bookFileId === fileId,
    );
    if (!file || file.editionSha256 !== editionSha256)
      throw new Error("READER_FILE_EDITION_MISMATCH");
    return file;
  };
  const checkPrincipal = (principal: ReaderPrincipal): void => {
    if (
      principal.ownerId !== owner.accountId ||
      !validId(principal.deviceId) ||
      !verifyOfflineReader(
        store.sqlite,
        owner.accountId,
        principal.deviceId,
        principal.token,
        now(),
      )
    )
      throw new Error("READER_PAIRING_REVOKED_OR_EXPIRED");
  };
  return Object.freeze({
    ownerAuth,
    now,
    authorizeReader: async (request: FastifyRequest): Promise<ReaderPrincipal | null> => {
      const deviceId = request.headers["x-reader-device-id"];
      const authorization = request.headers.authorization;
      if (typeof deviceId !== "string" || !validId(deviceId) || typeof authorization !== "string")
        return null;
      const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(authorization);
      if (!match) return null;
      const token = match[1]!;
      const at = now();
      if (!verifyOfflineReader(store.sqlite, owner.accountId, deviceId, token, at)) return null;
      return Object.freeze({ ownerId: owner.accountId, deviceId, token });
    },
    listFiles: () => listAuthenticatedPhase07Files(store.sqlite, owner),
    registerFile: (file: ReaderFile) => registerAuthenticatedPhase07File(store.sqlite, owner, file),
    readPersonal: (principal, fileId, editionSha256, kind, recordId) => {
      checkPrincipal(principal);
      return readOfflinePhase07Personal(store.sqlite, {
        ...principal,
        file: fileFor(fileId, editionSha256),
        kind: kind as "RATING" | "BOOKMARK" | "ANNOTATION",
        recordId,
        nowMs: now(),
      });
    },
    writePersonal: (principal, fileId, editionSha256, kind, recordId, event) => {
      checkPrincipal(principal);
      return recordOfflinePhase07Personal(store.sqlite, {
        ...principal,
        file: fileFor(fileId, editionSha256),
        kind: kind as "RATING" | "BOOKMARK" | "ANNOTATION",
        recordId,
        ...event,
        nowMs: now(),
      });
    },
    writeSession: (principal, fileId, editionSha256, event) => {
      checkPrincipal(principal);
      return recordOfflinePhase07Session(store.sqlite, {
        ...principal,
        file: fileFor(fileId, editionSha256),
        ...event,
        nowMs: now(),
      });
    },
    previewShelf: (principal, known, selected) => {
      checkPrincipal(principal);
      return previewOfflinePhase07Shelf(store.sqlite, {
        ...principal,
        nowMs: now(),
        trigger: "MANUAL_OWNER_ACTION",
        known: known.map((file) => fileFor(file.bookFileId, file.editionSha256)),
        selected: selected.map((file) => fileFor(file.bookFileId, file.editionSha256)),
      });
    },
  });
}
