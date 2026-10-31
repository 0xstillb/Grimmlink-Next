import { useCallback, useEffect, useRef, useState } from "react";
import { DiagnosticsClientError, fetchOwnerSession } from "./diagnostics-client.js";
import {
  controlLocalJob,
  fetchLocalJobEvents,
  fetchLocalJobs,
  type LocalJobAction,
  type LocalJobEvent,
  type LocalJobSummary,
} from "./local-jobs-client.js";

type ConnectionState = "loading" | "ready" | "owner-required" | "unavailable" | "error";

function errorState(error: unknown): { state: ConnectionState; message: string } {
  if (error instanceof DiagnosticsClientError && [401, 403].includes(error.status)) {
    return {
      state: "owner-required",
      message: "Sign in with the local owner session to view jobs.",
    };
  }
  if (error instanceof DiagnosticsClientError && error.status === 404) {
    return { state: "unavailable", message: "The authenticated local job API is not enabled." };
  }
  return {
    state: "error",
    message: "Local job data could not be loaded; response details are hidden.",
  };
}

const jobKind = (kind: LocalJobSummary["kind"]): string => {
  if (kind === "METADATA_MOCK") return "Metadata preview";
  if (kind === "COVER_MOCK") return "Cover preview";
  return "Restore preview";
};

const timestamp = (value: number): string => new Date(value).toLocaleString();

function JobActions({
  job,
  disabled,
  onAction,
}: {
  job: LocalJobSummary;
  disabled: boolean;
  onAction: (job: LocalJobSummary, action: LocalJobAction) => void;
}) {
  return (
    <div className="job-actions">
      {job.state === "PENDING" && !job.paused && (
        <button
          type="button"
          className="secondary-button"
          disabled={disabled}
          onClick={() => onAction(job, "PAUSE")}
        >
          Pause
        </button>
      )}
      {(job.state === "PENDING" || job.state === "FAILED") && job.paused && (
        <button
          type="button"
          className="secondary-button"
          disabled={disabled}
          onClick={() => onAction(job, "RESUME")}
        >
          Resume
        </button>
      )}
      {job.state === "FAILED" && job.attempts < job.maxAttempts && (
        <button
          type="button"
          className="secondary-button"
          disabled={disabled}
          onClick={() => onAction(job, "RETRY")}
        >
          Retry
        </button>
      )}
      {job.state === "LEASED" && <span className="muted">In progress</span>}
      {job.state === "UNKNOWN" && <span className="muted">Needs reconciliation</span>}
      {(job.state === "DONE" || job.state === "CANCELED") && (
        <span className="muted">No action</span>
      )}
    </div>
  );
}

export function JobsPanel({ onSignIn }: { onSignIn: () => void }) {
  const [jobs, setJobs] = useState<readonly LocalJobSummary[]>([]);
  const [events, setEvents] = useState<readonly LocalJobEvent[]>([]);
  const [state, setState] = useState<ConnectionState>("loading");
  const [message, setMessage] = useState("Checking the authenticated local job API.");
  const [busy, setBusy] = useState(false);
  const [busyJobId, setBusyJobId] = useState<string | null>(null);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const lastSeq = useRef(0);
  const inFlight = useRef(false);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    try {
      const session = await fetchOwnerSession(signal);
      if (signal?.aborted) return;
      if (!session.authenticated || !session.csrfToken) {
        setCsrfToken(null);
        setJobs([]);
        setEvents([]);
        setState("owner-required");
        setMessage("Sign in under Logs & Diagnostics to view and control the local queue.");
        return;
      }
      setCsrfToken(session.csrfToken);
      const [snapshot, nextEvents] = await Promise.all([
        fetchLocalJobs(signal),
        fetchLocalJobEvents(lastSeq.current, signal),
      ]);
      if (signal?.aborted) return;
      setJobs(snapshot.jobs);
      if (nextEvents.length > 0) {
        lastSeq.current = Math.max(lastSeq.current, ...nextEvents.map((event) => event.seq));
        setEvents((current) => {
          const merged = new Map(current.map((event) => [event.seq, event]));
          for (const event of nextEvents) merged.set(event.seq, event);
          return [...merged.values()].sort((a, b) => a.seq - b.seq).slice(-100);
        });
      }
      setState("ready");
      setMessage(
        "Owner-authenticated local queue connected. No worker or Official write is enabled.",
      );
    } catch (error) {
      if (signal?.aborted) return;
      const next = errorState(error);
      setJobs([]);
      setEvents([]);
      setState(next.state);
      setMessage(next.message);
    } finally {
      inFlight.current = false;
      if (!signal?.aborted) setBusy(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    const timer = window.setInterval(() => {
      if (!document.hidden) void refresh();
    }, 15_000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [refresh]);

  const act = async (job: LocalJobSummary, action: LocalJobAction) => {
    if (!csrfToken || state !== "ready" || busyJobId !== null) return;
    setBusyJobId(job.id);
    setMessage(`${action.toLowerCase()} requested for local job ${job.id}.`);
    try {
      await controlLocalJob(job.id, action, csrfToken);
      setMessage(`Local job ${action.toLowerCase()} recorded for ${job.id}.`);
      await refresh();
    } catch (error) {
      const next = errorState(error);
      setState(next.state);
      setMessage(next.state === "error" ? "Local job action was not confirmed." : next.message);
    } finally {
      setBusyJobId(null);
    }
  };

  return (
    <section className="panel jobs-panel" aria-label="Jobs and event stream">
      <div className="panel-heading">
        <h2>Jobs and event stream</h2>
        <span className="pill">Local queue</span>
      </div>
      <p>
        This view reads the durable local job ledger and finite SSE replay. Queue actions only
        pause, resume or retry local records; no job worker or Official/NAS transport is enabled.
      </p>
      <div className="job-safety-row">
        <span>Execution</span>
        <strong>DISABLED · no worker</strong>
        <span>Official writes</span>
        <strong>OFF</strong>
      </div>
      <div className="job-toolbar">
        <button
          type="button"
          className="secondary-button"
          disabled={busy}
          onClick={() => void refresh()}
        >
          {busy ? "Refreshing…" : "Refresh jobs"}
        </button>
        {state === "owner-required" && (
          <button type="button" className="secondary-button" onClick={onSignIn}>
            Sign in under Diagnostics
          </button>
        )}
      </div>
      <p role="status" aria-live="polite">
        {message}
      </p>
      {state === "ready" && jobs.length === 0 ? (
        <p className="empty-state">The local durable queue is empty.</p>
      ) : jobs.length > 0 ? (
        <div className="jobs-table-wrap">
          <table className="jobs-table">
            <thead>
              <tr>
                <th scope="col">Job</th>
                <th scope="col">State</th>
                <th scope="col">Attempts</th>
                <th scope="col">Updated</th>
                <th scope="col">Owner actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id}>
                  <th scope="row">
                    <strong>{jobKind(job.kind)}</strong>
                    <code>{job.id}</code>
                  </th>
                  <td>
                    {job.paused ? "PAUSED" : job.state}
                    {job.lastCode ? <small>{job.lastCode}</small> : null}
                  </td>
                  <td>
                    {job.attempts} / {job.maxAttempts}
                  </td>
                  <td>
                    <time dateTime={new Date(job.updatedAt).toISOString()}>
                      {timestamp(job.updatedAt)}
                    </time>
                  </td>
                  <td>
                    <JobActions
                      job={job}
                      disabled={busy || busyJobId !== null || !csrfToken}
                      onAction={(target, action) => void act(target, action)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <div className="job-events">
        <div className="panel-heading">
          <h3>Recent queue events</h3>
          <span className="pill">SSE replay · max 100</span>
        </div>
        {events.length === 0 ? (
          <p className="empty-state">No queue events have been received.</p>
        ) : (
          <ol>
            {events
              .slice()
              .reverse()
              .map((event) => (
                <li key={event.seq}>
                  <time dateTime={new Date(event.occurredAt).toISOString()}>
                    {timestamp(event.occurredAt)}
                  </time>
                  <code>
                    #{event.seq} · {event.jobId}
                  </code>
                  <strong>{event.transition}</strong>
                  <span>{event.code}</span>
                </li>
              ))}
          </ol>
        )}
      </div>
    </section>
  );
}
