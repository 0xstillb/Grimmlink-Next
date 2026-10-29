export type LocalJobState = "PENDING" | "LEASED" | "DONE" | "FAILED";
export function nextLocalJobState(from: LocalJobState, event: "CLAIM" | "SUCCEED" | "FAIL"): LocalJobState {
  if (from==="PENDING" && event==="CLAIM") return "LEASED";
  if (from==="LEASED" && event==="SUCCEED") return "DONE";
  if (from==="LEASED" && event==="FAIL") return "FAILED";
  throw new Error("Illegal local job transition");
}
