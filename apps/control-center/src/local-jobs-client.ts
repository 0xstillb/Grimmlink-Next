import { DiagnosticsClientError } from "./diagnostics-client.js";

const JOBS_PATH = "/api/grimmlink/v2/local/jobs";
const JOB_ID = /^[A-Za-z0-9][A-Za-z0-9:_-]{0,119}$/;
const SAFE_CODE = /^[A-Z_]{1,64}$/;
const CSRF = /^[A-Za-z0-9_-]{32,128}$/;
const MAX_RESPONSE_BYTES = 64 * 1024;

export type LocalJobAction = "PAUSE" | "RESUME" | "RETRY";
export type LocalJobSummary = Readonly<{
  id: string;
  kind: "METADATA_MOCK" | "COVER_MOCK" | "RESTORE_PREVIEW";
  state: "PENDING" | "LEASED" | "FAILED" | "UNKNOWN" | "DONE" | "CANCELED";
  paused: boolean;
  attempts: number;
  maxAttempts: number;
  dueAt: number;
  lastCode: string | null;
  createdAt: number;
  updatedAt: number;
}>;
export type LocalJobEvent = Readonly<{
  seq: number;
  jobId: string;
  transition: string;
  code: string;
  occurredAt: number;
}>;
export type LocalJobsSnapshot = Readonly<{
  jobs: readonly LocalJobSummary[];
  execution: "DISABLED_NO_WORKER";
  officialWrites: "OFF";
}>;

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

async function boundedText(response: Response): Promise<string> {
  if (!response.body) throw new Error("LOCAL_JOBS_RESPONSE_INVALID");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      bytes += next.value.byteLength;
      if (bytes > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new Error("LOCAL_JOBS_RESPONSE_TOO_LARGE");
      }
      text += decoder.decode(next.value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

async function requestJson(
  path: string,
  options: {
    method?: "GET" | "POST";
    body?: string;
    csrfToken?: string;
    signal?: AbortSignal;
  } = {},
): Promise<unknown> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.csrfToken !== undefined) {
    if (!CSRF.test(options.csrfToken)) throw new Error("LOCAL_JOBS_CSRF_INVALID");
    headers["x-csrf-token"] = options.csrfToken;
  }
  const response = await fetch(path, {
    method: options.method ?? "GET",
    credentials: "same-origin",
    mode: "same-origin",
    redirect: "error",
    cache: "no-store",
    headers,
    ...(options.body === undefined ? {} : { body: options.body }),
    ...(options.signal === undefined ? {} : { signal: options.signal }),
  });
  if (!response.ok) throw new DiagnosticsClientError(response.status);
  if (!response.headers.get("content-type")?.includes("application/json"))
    throw new Error("LOCAL_JOBS_RESPONSE_INVALID");
  try {
    return JSON.parse(await boundedText(response)) as unknown;
  } catch {
    throw new Error("LOCAL_JOBS_RESPONSE_INVALID");
  }
}

function parseJob(value: unknown): LocalJobSummary {
  const kinds = new Set(["METADATA_MOCK", "COVER_MOCK", "RESTORE_PREVIEW"]);
  const states = new Set(["PENDING", "LEASED", "FAILED", "UNKNOWN", "DONE", "CANCELED"]);
  if (
    !record(value) ||
    !exactKeys(value, [
      "id",
      "kind",
      "state",
      "paused",
      "attempts",
      "maxAttempts",
      "dueAt",
      "lastCode",
      "createdAt",
      "updatedAt",
    ]) ||
    typeof value.id !== "string" ||
    !JOB_ID.test(value.id) ||
    typeof value.kind !== "string" ||
    !kinds.has(value.kind) ||
    typeof value.state !== "string" ||
    !states.has(value.state) ||
    typeof value.paused !== "boolean" ||
    typeof value.attempts !== "number" ||
    !Number.isSafeInteger(value.attempts) ||
    value.attempts < 0 ||
    typeof value.maxAttempts !== "number" ||
    !Number.isSafeInteger(value.maxAttempts) ||
    value.maxAttempts < 1 ||
    value.maxAttempts > 5 ||
    value.attempts > value.maxAttempts ||
    typeof value.dueAt !== "number" ||
    !Number.isSafeInteger(value.dueAt) ||
    typeof value.createdAt !== "number" ||
    !Number.isSafeInteger(value.createdAt) ||
    typeof value.updatedAt !== "number" ||
    !Number.isSafeInteger(value.updatedAt) ||
    (value.lastCode !== null &&
      (typeof value.lastCode !== "string" || !SAFE_CODE.test(value.lastCode)))
  ) {
    throw new Error("LOCAL_JOBS_RESPONSE_INVALID");
  }
  return value as unknown as LocalJobSummary;
}

function parseEvent(value: unknown, id: string): LocalJobEvent {
  if (
    !record(value) ||
    !exactKeys(value, ["seq", "jobId", "transition", "code", "occurredAt"]) ||
    typeof value.seq !== "number" ||
    !Number.isSafeInteger(value.seq) ||
    value.seq < 1 ||
    value.seq !== Number(id) ||
    typeof value.jobId !== "string" ||
    !JOB_ID.test(value.jobId) ||
    typeof value.transition !== "string" ||
    !SAFE_CODE.test(value.transition) ||
    typeof value.code !== "string" ||
    !SAFE_CODE.test(value.code) ||
    typeof value.occurredAt !== "number" ||
    !Number.isSafeInteger(value.occurredAt) ||
    value.occurredAt < 0
  ) {
    throw new Error("LOCAL_JOB_EVENT_INVALID");
  }
  return value as unknown as LocalJobEvent;
}

export async function fetchLocalJobs(signal?: AbortSignal): Promise<LocalJobsSnapshot> {
  const value = await requestJson(JOBS_PATH, signal === undefined ? {} : { signal });
  if (
    !record(value) ||
    !exactKeys(value, ["jobs", "execution", "officialWrites"]) ||
    !Array.isArray(value.jobs) ||
    value.jobs.length > 100 ||
    value.execution !== "DISABLED_NO_WORKER" ||
    value.officialWrites !== "OFF"
  ) {
    throw new Error("LOCAL_JOBS_RESPONSE_INVALID");
  }
  const jobs = value.jobs.map(parseJob);
  if (new Set(jobs.map((job) => job.id)).size !== jobs.length)
    throw new Error("LOCAL_JOBS_RESPONSE_INVALID");
  return { jobs, execution: "DISABLED_NO_WORKER", officialWrites: "OFF" };
}

export async function fetchLocalJobEvents(
  afterSeq: number,
  signal?: AbortSignal,
): Promise<readonly LocalJobEvent[]> {
  if (!Number.isSafeInteger(afterSeq) || afterSeq < 0) throw new Error("LOCAL_JOB_CURSOR_INVALID");
  const response = await fetch(`${JOBS_PATH}/events`, {
    method: "GET",
    credentials: "same-origin",
    mode: "same-origin",
    redirect: "error",
    cache: "no-store",
    headers: { Accept: "text/event-stream", "Last-Event-ID": String(afterSeq) },
    ...(signal === undefined ? {} : { signal }),
  });
  if (!response.ok) throw new DiagnosticsClientError(response.status);
  if (!response.headers.get("content-type")?.toLowerCase().startsWith("text/event-stream"))
    throw new Error("LOCAL_JOB_EVENT_STREAM_INVALID");
  const text = await boundedText(response);
  if (text.length === 0) return [];
  const events: LocalJobEvent[] = [];
  for (const block of text.split(/\r?\n\r?\n/)) {
    if (!block) continue;
    const lines = block.split(/\r?\n/);
    if (
      lines.length !== 3 ||
      !lines[0]!.startsWith("id: ") ||
      lines[1] !== "event: job" ||
      !lines[2]!.startsWith("data: ")
    ) {
      throw new Error("LOCAL_JOB_EVENT_STREAM_INVALID");
    }
    const id = lines[0]!.slice(4);
    if (!/^[1-9][0-9]{0,14}$/.test(id)) throw new Error("LOCAL_JOB_EVENT_INVALID");
    let parsed: unknown;
    try {
      parsed = JSON.parse(lines[2]!.slice(6)) as unknown;
    } catch {
      throw new Error("LOCAL_JOB_EVENT_INVALID");
    }
    events.push(parseEvent(parsed, id));
    if (events.length > 100) throw new Error("LOCAL_JOB_EVENT_STREAM_INVALID");
  }
  return events;
}

export async function controlLocalJob(
  id: string,
  action: LocalJobAction,
  csrfToken: string,
): Promise<Readonly<{ status: "APPLIED" } | { status: "RETRY_SCHEDULED"; dueAt: number }>> {
  if (!JOB_ID.test(id) || !["PAUSE", "RESUME", "RETRY"].includes(action))
    throw new Error("LOCAL_JOB_ACTION_INVALID");
  const value = await requestJson(`${JOBS_PATH}/${encodeURIComponent(id)}/control`, {
    method: "POST",
    csrfToken,
    body: JSON.stringify({ action }),
  });
  if (!record(value)) throw new Error("LOCAL_JOB_CONTROL_RESPONSE_INVALID");
  if (exactKeys(value, ["status"]) && value.status === "APPLIED") return { status: "APPLIED" };
  if (
    exactKeys(value, ["status", "dueAt"]) &&
    value.status === "RETRY_SCHEDULED" &&
    typeof value.dueAt === "number" &&
    Number.isSafeInteger(value.dueAt)
  ) {
    return { status: "RETRY_SCHEDULED", dueAt: value.dueAt };
  }
  throw new Error("LOCAL_JOB_CONTROL_RESPONSE_INVALID");
}
