import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  clearDiagnosticLogs,
  DiagnosticsClientError,
  disableDiagnosticLease,
  enableDiagnosticLease,
  fetchOwnerSession,
  fetchDiagnosticLease,
  fetchDiagnosticLogs,
  loginOwner,
  logoutOwner,
  type DiagnosticCode,
  type DiagnosticLevel,
  type DiagnosticLease,
  type SafeDiagnosticLog,
} from "./diagnostics-client.js";

type ConnectionState = "loading" | "ready" | "owner-required" | "unavailable" | "error";

function errorMessage(error: unknown): { state: ConnectionState; message: string } {
  if (error instanceof DiagnosticsClientError && error.status === 403) {
    return { state: "owner-required", message: "Owner authorization or CSRF verification failed." };
  }
  if (error instanceof DiagnosticsClientError && error.status === 429) {
    return {
      state: "owner-required",
      message: "Too many sign-in attempts. Wait before trying again.",
    };
  }
  if (error instanceof DiagnosticsClientError && error.status === 404) {
    return { state: "unavailable", message: "Diagnostics routes are not enabled by this adapter." };
  }
  return {
    state: "error",
    message: "Diagnostics could not be loaded. Server response details are hidden.",
  };
}

const levelLabel = (level: number): string =>
  ({ 10: "TRACE", 20: "DEBUG", 30: "INFO", 40: "WARN", 50: "ERROR", 60: "FATAL" })[level] ??
  "UNKNOWN";

function DiagnosticEntry({ entry }: { entry: SafeDiagnosticLog }) {
  return (
    <li className="diagnostic-entry">
      <time dateTime={new Date(entry.time).toISOString()}>
        {new Date(entry.time).toISOString()}
      </time>
      <span className={`diagnostic-level level-${levelLabel(entry.level).toLowerCase()}`}>
        {levelLabel(entry.level)}
      </span>
      <strong>{entry.code}</strong>
      {entry.count !== undefined && <span>Count {entry.count}</span>}
      {entry.request && (
        <code>
          {entry.request.method} · {entry.request.id}
        </code>
      )}
    </li>
  );
}

export function DiagnosticsViewer() {
  const [logs, setLogs] = useState<readonly SafeDiagnosticLog[]>([]);
  const [lease, setLease] = useState<DiagnosticLease | null>(null);
  const [state, setState] = useState<ConnectionState>("loading");
  const [message, setMessage] = useState("Checking the local diagnostics endpoint.");
  const [busy, setBusy] = useState(false);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [level, setLevel] = useState<DiagnosticLevel | "all">("all");
  const [code, setCode] = useState<DiagnosticCode | "all">("all");
  const [requestId, setRequestId] = useState("");
  const [appliedRequestId, setAppliedRequestId] = useState("");

  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      setBusy(true);
      try {
        const ownerSession = await fetchOwnerSession(signal);
        if (signal?.aborted) return;
        if (!ownerSession.authenticated || !ownerSession.csrfToken) {
          setCsrfToken(null);
          setLogs([]);
          setLease(null);
          setState("owner-required");
          setMessage("Sign in with the local owner password to view diagnostics.");
          return;
        }
        setCsrfToken(ownerSession.csrfToken);
        const filter = {
          ...(level === "all" ? {} : { level }),
          ...(code === "all" ? {} : { code }),
          ...(appliedRequestId ? { requestId: appliedRequestId } : {}),
          limit: 100,
        };
        const [nextLogs, nextLease] = await Promise.all([
          fetchDiagnosticLogs(filter, signal),
          fetchDiagnosticLease(signal),
        ]);
        if (signal?.aborted) return;
        setLogs(nextLogs);
        setLease(nextLease);
        setState("ready");
        setMessage("Owner-authorized, allow-listed diagnostics are connected.");
      } catch (error) {
        if (signal?.aborted) return;
        const next = errorMessage(error);
        setLogs([]);
        setLease(null);
        setState(next.state);
        setMessage(next.message);
      } finally {
        if (!signal?.aborted) setBusy(false);
      }
    },
    [appliedRequestId, code, level],
  );

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  const runMutation = async (
    operation: () => Promise<DiagnosticLease | void>,
    success: string,
    refreshAfter = false,
  ) => {
    if (!csrfToken || state !== "ready") return;
    setBusy(true);
    try {
      const result = await operation();
      if (result) setLease(result);
      if (refreshAfter) {
        const filter = {
          ...(level === "all" ? {} : { level }),
          ...(code === "all" ? {} : { code }),
          ...(appliedRequestId ? { requestId: appliedRequestId } : {}),
          limit: 100,
        };
        const [nextLogs, nextLease] = await Promise.all([
          fetchDiagnosticLogs(filter),
          fetchDiagnosticLease(),
        ]);
        setLogs(nextLogs);
        setLease(nextLease);
      }
      setMessage(success);
    } catch (error) {
      const next = errorMessage(error);
      setState(next.state);
      setMessage(next.message);
      setLogs([]);
      setLease(null);
    } finally {
      setBusy(false);
    }
  };

  const canControl = state === "ready" && csrfToken !== null && !busy;
  const leaseText =
    lease?.level === "debug" || lease?.level === "trace"
      ? `${lease.level.toUpperCase()} until ${new Date(lease.expiresAt!).toISOString()}`
      : "Inactive";

  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      requestId &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)
    ) {
      setMessage("Correlation ID must be a UUID.");
      return;
    }
    setAppliedRequestId(requestId);
  };

  const submitLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || password.length === 0) return;
    setBusy(true);
    setMessage("Signing in to the local Control Center.");
    try {
      const session = await loginOwner(password);
      setPassword("");
      setCsrfToken(session.csrfToken);
      setState("ready");
      setMessage("Owner session started. Session expires after 10 minutes.");
      await refresh();
    } catch (error) {
      setPassword("");
      if (error instanceof DiagnosticsClientError && error.status === 401) {
        setMessage("Owner password was not accepted.");
      } else {
        const next = errorMessage(error);
        setState(next.state);
        setMessage(next.message);
      }
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    if (!csrfToken || busy) return;
    setBusy(true);
    try {
      await logoutOwner(csrfToken);
      setCsrfToken(null);
      setLogs([]);
      setLease(null);
      setState("owner-required");
      setMessage("Owner session ended.");
    } catch (error) {
      const next = errorMessage(error);
      setCsrfToken(null);
      setState(next.state);
      setMessage(next.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="diagnostics-viewer" aria-label="Live diagnostics">
      <div className="panel-heading">
        <h3>Process logs</h3>
        <div className="status-row">
          <span className="pill">{state === "ready" ? "Owner session" : "Protected"}</span>
          {state === "ready" && (
            <button
              className="secondary-button"
              type="button"
              disabled={busy}
              onClick={() => void signOut()}
            >
              Sign out
            </button>
          )}
        </div>
      </div>
      <p role="status" aria-live="polite">
        {message}
      </p>
      {state === "owner-required" && (
        <form className="owner-login-form" onSubmit={submitLogin}>
          <label>
            Local owner password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              maxLength={1024}
              required
              spellCheck={false}
            />
          </label>
          <button className="primary-button" type="submit" disabled={busy || password.length === 0}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      )}
      <form className="diagnostic-filters" onSubmit={applyFilters}>
        <label>
          Level
          <select
            value={level}
            onChange={(event) => setLevel(event.target.value as DiagnosticLevel | "all")}
          >
            <option value="all">All levels</option>
            {(["trace", "debug", "info", "warn", "error", "fatal"] as const).map((value) => (
              <option key={value} value={value}>
                {value.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
        <label>
          Event
          <select
            value={code}
            onChange={(event) => setCode(event.target.value as DiagnosticCode | "all")}
          >
            <option value="all">All events</option>
            {(["REQUEST_SUMMARY", "SQLITE_RETRY", "MIGRATION_STAGE"] as const).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="correlation-filter">
          Correlation ID
          <input
            value={requestId}
            onChange={(event) => setRequestId(event.target.value)}
            placeholder="Optional UUID"
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <button className="secondary-button" type="submit" disabled={busy}>
          Apply filters
        </button>
        <button
          className="secondary-button"
          type="button"
          disabled={busy}
          onClick={() => void refresh()}
        >
          Refresh logs
        </button>
      </form>
      <div className="diagnostic-actions" aria-label="Protected diagnostics controls">
        <button
          className="secondary-button"
          type="button"
          disabled={!canControl}
          title={!canControl ? "Owner session and CSRF token required." : undefined}
          onClick={() =>
            void runMutation(
              () => enableDiagnosticLease("debug", csrfToken!),
              "DEBUG lease enabled for at most 30 minutes.",
            )
          }
        >
          Enable DEBUG · 30 min
        </button>
        <button
          className="secondary-button"
          type="button"
          disabled={!canControl}
          title={!canControl ? "Owner session and CSRF token required." : undefined}
          onClick={() =>
            void runMutation(
              () => enableDiagnosticLease("trace", csrfToken!),
              "TRACE lease enabled for at most 5 minutes.",
            )
          }
        >
          Enable TRACE · 5 min
        </button>
        <button
          className="secondary-button"
          type="button"
          disabled={!canControl || lease?.level === "info"}
          title={!canControl ? "Owner session and CSRF token required." : undefined}
          onClick={() =>
            void runMutation(
              () => disableDiagnosticLease(csrfToken!),
              "Diagnostics lease disabled.",
            )
          }
        >
          Disable lease
        </button>
        <button
          className="secondary-button"
          type="button"
          disabled={!canControl}
          title={!canControl ? "Owner session and CSRF token required." : undefined}
          onClick={() =>
            void runMutation(
              () => clearDiagnosticLogs(csrfToken!),
              "Cleared retained diagnostic lines.",
              true,
            )
          }
        >
          Clear logs
        </button>
      </div>
      <div className="status-row">
        <span>Active DEBUG / TRACE lease</span>
        <strong>{leaseText}</strong>
      </div>
      {state === "ready" && logs.length > 0 ? (
        <ol className="diagnostic-entries" aria-label="Allow-listed log entries">
          {logs.map((entry, index) => (
            <DiagnosticEntry key={`${entry.time}-${entry.code}-${index}`} entry={entry} />
          ))}
        </ol>
      ) : (
        <p className="empty-state" aria-live="polite">
          {state === "ready"
            ? "No matching safe diagnostic events."
            : "No diagnostic log text is displayed."}
        </p>
      )}
    </section>
  );
}
