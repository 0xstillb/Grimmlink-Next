import { afterEach, expect, it, vi } from "vitest";
import { controlLocalJob, fetchLocalJobEvents, fetchLocalJobs } from "./local-jobs-client.js";

afterEach(() => vi.unstubAllGlobals());

const job = {
  id: "job-1",
  kind: "METADATA_MOCK",
  state: "PENDING",
  paused: false,
  attempts: 0,
  maxAttempts: 3,
  dueAt: 1_800_000_000_000,
  lastCode: null,
  createdAt: 1_799_999_999_000,
  updatedAt: 1_799_999_999_000,
} as const;

it("uses a same-origin bounded snapshot contract and rejects unexpected fields", async () => {
  const fetchMock = vi.fn(
    async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(
        JSON.stringify({ jobs: [job], execution: "DISABLED_NO_WORKER", officialWrites: "OFF" }),
        { headers: { "content-type": "application/json" } },
      ),
  );
  vi.stubGlobal("fetch", fetchMock);
  expect(await fetchLocalJobs()).toEqual({
    jobs: [job],
    execution: "DISABLED_NO_WORKER",
    officialWrites: "OFF",
  });
  expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/grimmlink/v2/local/jobs");
  expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
    method: "GET",
    credentials: "same-origin",
    mode: "same-origin",
    redirect: "error",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });

  fetchMock.mockResolvedValueOnce(
    new Response(
      JSON.stringify({
        jobs: [{ ...job, book_id: "private-book", plan_hash: "secret" }],
        execution: "DISABLED_NO_WORKER",
        officialWrites: "OFF",
      }),
      { headers: { "content-type": "application/json" } },
    ),
  );
  await expect(fetchLocalJobs()).rejects.toThrow("LOCAL_JOBS_RESPONSE_INVALID");
});

it("requests finite event replay with a numeric cursor and validates event frames", async () => {
  const event = {
    seq: 9,
    jobId: "job-1",
    transition: "ENQUEUED",
    code: "LOCAL_PLAN_ONLY",
    occurredAt: 1_800_000_000_000,
  };
  const fetchMock = vi.fn(
    async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(`id: 9\nevent: job\ndata: ${JSON.stringify(event)}\n\n`, {
        headers: { "content-type": "text/event-stream; charset=utf-8" },
      }),
  );
  vi.stubGlobal("fetch", fetchMock);
  expect(await fetchLocalJobEvents(8)).toEqual([event]);
  expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/grimmlink/v2/local/jobs/events");
  expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
    credentials: "same-origin",
    mode: "same-origin",
    redirect: "error",
    cache: "no-store",
    headers: { Accept: "text/event-stream", "Last-Event-ID": "8" },
  });

  fetchMock.mockResolvedValueOnce(
    new Response(`id: 10\nevent: job\ndata: ${JSON.stringify(event)}\n\n`, {
      headers: { "content-type": "text/event-stream" },
    }),
  );
  await expect(fetchLocalJobEvents(8)).rejects.toThrow("LOCAL_JOB_EVENT_INVALID");
});

it("sends only owner-CSRF-protected allow-listed local actions", async () => {
  const fetchMock = vi.fn(
    async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(JSON.stringify({ status: "APPLIED" }), {
        headers: { "content-type": "application/json" },
      }),
  );
  vi.stubGlobal("fetch", fetchMock);
  const csrfToken = "A".repeat(43);
  await expect(controlLocalJob("bad/id", "PAUSE", csrfToken)).rejects.toThrow(
    "LOCAL_JOB_ACTION_INVALID",
  );
  expect(fetchMock).not.toHaveBeenCalled();

  expect(await controlLocalJob("job-1", "PAUSE", csrfToken)).toEqual({ status: "APPLIED" });
  expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/grimmlink/v2/local/jobs/job-1/control");
  expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
    method: "POST",
    credentials: "same-origin",
    mode: "same-origin",
    redirect: "error",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify({ action: "PAUSE" }),
  });
});
