export interface IngestionPlan {
  readonly action: "DRY_RUN_ONLY";
  readonly source: "NAS_OPF";
  readonly writesAllowed: false;
}
/** No OPF read/write or metadata mutation in Phase01. */
export function planIngestion(): IngestionPlan {
  return Object.freeze({ action: "DRY_RUN_ONLY", source: "NAS_OPF", writesAllowed: false });
}
