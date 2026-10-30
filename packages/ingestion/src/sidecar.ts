import { readNasFixtureFile } from "@grimmlink/locations";
import type { SparseMetadata } from "./index.js";

const fields = ["title", "subtitle", "publisher", "publishedDate", "description", "seriesName", "seriesNumber", "isbn13", "isbn10", "language"] as const;
export interface SidecarPreview {
  readonly source: "SIDECAR_OFFLINE_FIXTURE";
  readonly metadata: Readonly<SparseMetadata>;
  readonly importsEnabled: false;
  readonly adjacentWriteEnabled: false;
}
function object(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid Sidecar object");
  return value as Record<string, unknown>;
}
export function parseSidecarPreview(bytes: Uint8Array): SidecarPreview {
  if (bytes.byteLength < 2 || bytes.byteLength > 1024 * 1024) throw new Error("Sidecar byte bound");
  const raw: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  const root = object(raw);
  // Legacy flat JSON and modern { metadata } are both supported, but never merge ambiguously.
  const record = object(Object.hasOwn(root, "metadata") ? root.metadata : root);
  const result: SparseMetadata = {};
  for (const key of fields) {
    const value = record[key];
    if (value === undefined || value === null) continue;
    if (key === "seriesNumber") {
      if (typeof value !== "number" || !Number.isFinite(value) || value <= 0 || value > 100000) throw new Error("Invalid Sidecar series number");
      result[key] = value;
    } else {
      if (typeof value !== "string" || value.trim().length === 0 || value.length > (key === "description" ? 8192 : 512) || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value))
        throw new Error("Invalid Sidecar scalar");
      result[key] = value.trim();
    }
  }
  return Object.freeze({ source: "SIDECAR_OFFLINE_FIXTURE", metadata: Object.freeze(result), importsEnabled: false, adjacentWriteEnabled: false });
}
/** OPF stays primary. Fallback is strictly opt-in, and only when OPF is missing. */
export function selectMetadataSource(opfPresent: boolean, userOptedIntoFallback: boolean): "OPF_PRIMARY" | "SIDECAR_FALLBACK" | "NONE" {
  return opfPresent ? "OPF_PRIMARY" : userOptedIntoFallback ? "SIDECAR_FALLBACK" : "NONE";
}
/** No Official client, credential, mutation or NAS write is accepted by this function. */
export function planManualSidecarImport(preview: SidecarPreview, ownerConfirmed: boolean) {
  if (!ownerConfirmed) throw new Error("Explicit owner confirmation required");
  return Object.freeze({ action: "PREVIEW_ONLY" as const, metadata: preview.metadata, requiresVerifiedOfficialIdentity: true as const, writesAllowed: false as const });
}
export async function inspectOfflineSidecarFixture(root: string, relativePath: string): Promise<SidecarPreview> {
  const file = await readNasFixtureFile(root, relativePath, 1024 * 1024);
  if (!file.relativePath.toLowerCase().endsWith(".json")) throw new Error("Sidecar must be JSON");
  return parseSidecarPreview(file.bytes);
}

