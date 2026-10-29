import { isAbsolute, normalize, sep } from "node:path";
export type NasLocationPlan = Readonly<{ relativePath: string; access: "UNVERIFIED_READ_ONLY" }>;
/** Lexical plan ONLY; symlink resolution + mount proof belong in Phase03. */
export function planReadOnlyLocation(relativePath: string): NasLocationPlan {
  if (typeof relativePath !== "string" || relativePath.includes("\\") || relativePath.includes("\0") ||
    isAbsolute(relativePath) || relativePath.split("/").some(segment => !segment || segment==="." || segment==="..")) {
    throw new Error("Unsafe NAS relative path");
  }
  const clean = normalize(relativePath);
  if (clean.startsWith(".."+sep)) throw new Error("Unsafe path");
  return Object.freeze({ relativePath:clean, access:"UNVERIFIED_READ_ONLY" });
}
