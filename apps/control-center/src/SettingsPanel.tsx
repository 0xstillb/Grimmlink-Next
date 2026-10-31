import { useCallback, useEffect, useState } from "react";
import { DiagnosticsClientError, fetchOwnerSession } from "./diagnostics-client.js";
import { fetchLocalSecurityPolicy, type LocalSecurityPolicy } from "./local-settings-client.js";
import { LocalDevicesPanel } from "./LocalDevicesPanel.js";

type ConnectionState = "loading" | "ready" | "owner-required" | "unavailable" | "error";

function errorState(error: unknown): { state: ConnectionState; message: string } {
  if (error instanceof DiagnosticsClientError && [401, 403].includes(error.status)) {
    return {
      state: "owner-required",
      message: "Sign in under Logs & Diagnostics to read this local policy snapshot.",
    };
  }
  if (error instanceof DiagnosticsClientError && error.status === 404) {
    return {
      state: "unavailable",
      message: "The owner-authenticated settings API is not enabled.",
    };
  }
  return {
    state: "error",
    message: "The local policy snapshot could not be loaded; response details are hidden.",
  };
}

const policyRows = (policy: LocalSecurityPolicy) => [
  ["Workspace mode", policy.mode],
  ["Official forwarding", policy.officialForwarding],
  ["Protected writes", policy.protectedWrites],
  ["Native KOSync progress", policy.nativeKosync],
  ["Personal bridge", policy.personalBridge],
  ["Session bridge", policy.sessionBridge],
  ["Progress reset", policy.resetProgress],
  ["Managed projection", policy.managedProjection],
  ["Automatic updates", policy.automaticUpdates],
  ["Production authorization", policy.production],
];

export function SettingsPanel({ onSignIn }: { onSignIn: () => void }) {
  const [policy, setPolicy] = useState<LocalSecurityPolicy | null>(null);
  const [state, setState] = useState<ConnectionState>("loading");
  const [message, setMessage] = useState("Checking the authenticated local security policy API.");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setBusy(true);
    try {
      const session = await fetchOwnerSession(signal);
      if (signal?.aborted) return;
      if (!session.authenticated) {
        setPolicy(null);
        setState("owner-required");
        setMessage("Sign in under Logs & Diagnostics to read the local policy snapshot.");
        return;
      }
      const next = await fetchLocalSecurityPolicy(signal);
      if (signal?.aborted) return;
      setPolicy(next);
      setState("ready");
      setMessage("Owner-authenticated policy loaded. This is not deployment or service telemetry.");
    } catch (error) {
      if (signal?.aborted) return;
      const next = errorState(error);
      setPolicy(null);
      setState(next.state);
      setMessage(next.message);
    } finally {
      if (!signal?.aborted) setBusy(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  return (
    <section className="panel settings-panel" aria-label="Owner-authenticated safety settings">
      <div className="panel-heading">
        <h2>Private safety settings</h2>
        <span className="pill">Read-only policy</span>
      </div>
      <p>
        This owner-authenticated view reports fixed safety policy in the local Adapter build. It
        cannot change settings and does not prove that a deployment, Official service or reader is
        connected.
      </p>
      <div className="job-toolbar">
        <button
          type="button"
          className="secondary-button"
          disabled={busy}
          onClick={() => void refresh()}
        >
          {busy ? "Refreshing…" : "Refresh policy"}
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
      {state === "ready" && policy && (
        <div className="settings-policy" aria-label="Fixed fail-closed policy values">
          {policyRows(policy).map(([label, value]) => (
            <div className="status-row" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
          <p className="muted">Source: {policy.source}</p>
        </div>
      )}
      <LocalDevicesPanel onSignIn={onSignIn} />
    </section>
  );
}
