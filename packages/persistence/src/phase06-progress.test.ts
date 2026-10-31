import { expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { openLocalStore } from "./index.js";
import { pairOfflineReader, revokeOfflineReader } from "./phase05-devices.js";
import {
  recordOfflinePhase06Progress,
  readOfflinePhase06Resume,
  registerOfflineProgressFile,
} from "./phase06-progress.js";

const migrations = resolve(fileURLToPath(new URL("../migrations", import.meta.url)));
const owner = { kind: "verified-owner-fixture" as const, accountId: "one_owner" };
const other = { kind: "verified-owner-fixture" as const, accountId: "other_owner" };
const pdf = {
  bookId: "book1",
  bookFileId: "file_pdf",
  editionSha256: "a".repeat(64),
  format: "PDF" as const,
  verifiedFixturePageCount: 220,
};
const epub = {
  bookId: "book1",
  bookFileId: "file_epub",
  editionSha256: "b".repeat(64),
  format: "EPUB" as const,
};
const epubPosition = {
  kind: "EPUB_EXACT" as const,
  anchorId: "chapter_1",
  nativePosition: "epubcfi(/6/2[chapter1]!/4/2/2:0)",
  evidence: "OFFLINE_SYNTHETIC_FIXTURE_ONLY" as const,
};
const domEpubPosition = {
  kind: "EPUB_EXACT" as const,
  anchorId: "dom_verified_anchor",
  nativePosition: "/body/DocFragment[1]/body/p[1]/text().0",
  evidence: "EPUB_DOM_ROUNDTRIP_ONLY" as const,
};

it("persists PDF page and EPUB native position across restarts, no invented percentage", () => {
  const dir = mkdtempSync(join(tmpdir(), "phase06-persist-"));
  try {
    const file = join(dir, "local.sqlite");
    let store = openLocalStore(file, migrations);
    const paired = pairOfflineReader(store.sqlite, owner, "reader", 100, 10000);
    registerOfflineProgressFile(store.sqlite, owner, pdf);
    registerOfflineProgressFile(store.sqlite, owner, epub);
    const getPdf = () =>
      readOfflinePhase06Resume(store.sqlite, {
        ownerId: owner.accountId,
        deviceId: "reader",
        token: paired.token,
        identity: pdf,
        nowMs: 201,
      });
    expect(getPdf()).toEqual({ status: "NO_POSITION", percentage: null });
    const putPdf = {
      ownerId: owner.accountId,
      deviceId: "reader",
      token: paired.token,
      identity: pdf,
      eventId: "evt_pdf1",
      expectedRevision: 0,
      position: { kind: "PDF_PAGE" as const, pageNumber: 12 },
      nowMs: 200,
    };
    expect(recordOfflinePhase06Progress(store.sqlite, putPdf)).toEqual({
      status: "LOCAL_RECORDED",
      revision: 1,
    });
    expect(recordOfflinePhase06Progress(store.sqlite, putPdf)).toEqual({
      status: "LOCAL_RECORDED",
      revision: 1,
    });
    expect(
      recordOfflinePhase06Progress(store.sqlite, {
        ...putPdf,
        eventId: "evt_stale",
        position: { kind: "PDF_PAGE", pageNumber: 120 },
      }),
    ).toEqual({ status: "CONFLICT", revision: 1 });
    expect(() =>
      recordOfflinePhase06Progress(store.sqlite, {
        ...putPdf,
        position: { kind: "PDF_PAGE", pageNumber: 14 },
      }),
    ).toThrow("PHASE06_EVENT_REPLAY_MISMATCH");
    expect(
      recordOfflinePhase06Progress(store.sqlite, {
        ...putPdf,
        identity: epub,
        position: epubPosition,
        eventId: "evt_epub",
      }),
    ).toEqual({ status: "LOCAL_RECORDED", revision: 1 });
    store.close();
    store = openLocalStore(file, migrations);
    expect(getPdf()).toEqual({
      status: "LOCAL_PREVIEW_ONLY",
      revision: 1,
      kind: "PDF_PAGE",
      pageNumber: 12,
      pageCount: 220,
      label: "Page 12 of 220",
      evidence: "OFFLINE_FIXTURE_PAGE_COUNT_ONLY",
      percentage: null,
    });
    expect(
      readOfflinePhase06Resume(store.sqlite, {
        ownerId: owner.accountId,
        deviceId: "reader",
        token: paired.token,
        identity: epub,
        nowMs: 201,
      }),
    ).toEqual({
      status: "LOCAL_PREVIEW_ONLY",
      revision: 1,
      kind: "EPUB_EXACT",
      nativePosition: epubPosition.nativePosition,
      label: "Resume at synthetic fixture anchor",
      evidence: "OFFLINE_SYNTHETIC_FIXTURE_ONLY",
      percentage: null,
    });
    expect(
      recordOfflinePhase06Progress(store.sqlite, {
        ownerId: owner.accountId,
        deviceId: "reader",
        token: paired.token,
        identity: epub,
        eventId: "evt_epub_dom",
        expectedRevision: 1,
        position: domEpubPosition,
        nowMs: 202,
      }),
    ).toEqual({ status: "LOCAL_RECORDED", revision: 2 });
    store.close();
    store = openLocalStore(file, migrations);
    expect(
      readOfflinePhase06Resume(store.sqlite, {
        ownerId: owner.accountId,
        deviceId: "reader",
        token: paired.token,
        identity: epub,
        nowMs: 203,
      }),
    ).toEqual({
      status: "LOCAL_PREVIEW_ONLY",
      revision: 2,
      kind: "EPUB_EXACT",
      nativePosition: domEpubPosition.nativePosition,
      label: "Resume at EPUB DOM-verified anchor",
      evidence: "EPUB_DOM_ROUNDTRIP_ONLY",
      percentage: null,
    });
    store.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

it("rejects drift, unauthenticated/revoked readers, invalid pages and cross-format positions", () => {
  const dir = mkdtempSync(join(tmpdir(), "phase06-negative-"));
  try {
    const store = openLocalStore(join(dir, "local.sqlite"), migrations);
    const pair = pairOfflineReader(store.sqlite, owner, "tablet", 100, 10000);
    registerOfflineProgressFile(store.sqlite, owner, pdf);
    expect(() => registerOfflineProgressFile(store.sqlite, other, epub)).toThrow(
      "PHASE06_OWNER_MISMATCH",
    );
    expect(() =>
      registerOfflineProgressFile(store.sqlite, owner, {
        ...pdf,
        editionSha256: "c".repeat(64),
      }),
    ).toThrow("PHASE06_EDITION_DRIFT");
    expect(() =>
      registerOfflineProgressFile(store.sqlite, owner, {
        ...pdf,
        verifiedFixturePageCount: 219,
      }),
    ).toThrow("PHASE06_EDITION_DRIFT");
    const put = {
      ownerId: owner.accountId,
      deviceId: "tablet",
      token: pair.token,
      identity: pdf,
      eventId: "ev1",
      expectedRevision: 0,
      nowMs: 200,
      position: { kind: "PDF_PAGE" as const, pageNumber: 1 },
    };
    expect(() => recordOfflinePhase06Progress(store.sqlite, { ...put, token: "bad" })).toThrow(
      "PHASE06_READER_REVOKED_OR_EXPIRED",
    );
    expect(() =>
      recordOfflinePhase06Progress(store.sqlite, {
        ...put,
        position: { kind: "PDF_PAGE", pageNumber: 221 },
      }),
    ).toThrow("PHASE06_OFFLINE_POSITION_INVALID");
    expect(() =>
      recordOfflinePhase06Progress(store.sqlite, {
        ...put,
        position: epubPosition,
      }),
    ).toThrow("PHASE06_OFFLINE_POSITION_INVALID");
    expect(() =>
      recordOfflinePhase06Progress(store.sqlite, {
        ...put,
        identity: { ...pdf, editionSha256: "d".repeat(64) },
      }),
    ).toThrow("PHASE06_EVENT_EDITION_MISMATCH");
    expect(() =>
      recordOfflinePhase06Progress(store.sqlite, {
        ...put,
        identity: epub,
        position: epubPosition,
      }),
    ).toThrow("PHASE06_EVENT_EDITION_MISMATCH");
    revokeOfflineReader(store.sqlite, owner, "tablet", 202);
    expect(() =>
      recordOfflinePhase06Progress(store.sqlite, {
        ...put,
        nowMs: 203,
      }),
    ).toThrow("PHASE06_READER_REVOKED_OR_EXPIRED");
    expect(() =>
      readOfflinePhase06Resume(store.sqlite, {
        ownerId: owner.accountId,
        deviceId: "tablet",
        token: pair.token,
        identity: pdf,
        nowMs: 203,
      }),
    ).toThrow("PHASE06_READER_REVOKED_OR_EXPIRED");
    store.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
