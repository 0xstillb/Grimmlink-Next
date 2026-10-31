import { useCallback, useEffect, useState } from "react";
import { DiagnosticsClientError, fetchOwnerSession } from "./diagnostics-client.js";
import {
  fetchLocalDiagnosticsSettings,
  fetchLocalSecurityPolicy,
  updateLocalDiagnosticsSettings,
  type LocalDiagnosticsRetention,
  type LocalSecurityPolicy,
} from "./local-settings-client.js";
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
  const [retention, setRetention] = useState<LocalDiagnosticsRetention | null>(null);
  const [state, setState] = useState<ConnectionState>("loading");
  const [message, setMessage] = useState("Checking the authenticated local security policy API.");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);

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
      const [next, nextRetention] = await Promise.all([
        fetchLocalSecurityPolicy(signal),
        fetchLocalDiagnosticsSettings(signal),
      ]);
      if (signal?.aborted) return;
      setPolicy(next);
      setRetention({
        maxEntries: nextRetention.maxEntries,
        maxBytes: nextRetention.maxBytes,
        retentionHours: nextRetention.retentionHours,
      });
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

  const saveRetention = async () => {
    setSaving(true);
    try {
      const session = await fetchOwnerSession();
      if (!session.authenticated || !session.csrfToken) {
        setState("owner-required");
        setMessage("Sign in under Logs & Diagnostics to update local diagnostics retention.");
        return;
      }
      if (!retention) return;
      const saved = await updateLocalDiagnosticsSettings(session.csrfToken, retention);
      setRetention({
        maxEntries: saved.maxEntries,
        maxBytes: saved.maxBytes,
        retentionHours: saved.retentionHours,
      });
      setMessage("Diagnostics retention saved and applied to the in-memory log buffer.");
    } catch (error) {
      const next = errorState(error);
      setMessage(next.message);
      if (next.state !== "error") setState(next.state);
    } finally {
      setSaving(false);
    }
  };

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
        The safety policy below is fixed and read-only. Diagnostics retention can be adjusted
        separately within the displayed local limits. This view does not prove that a deployment,
        Official service or reader is connected.
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
      {state === "ready" && retention && (
        <div className="settings-policy" aria-label="Local diagnostics retention settings">
          <h3>Diagnostics retention</h3>
          <p className="muted">
            These limits affect only the bounded in-memory diagnostic log. Maximums: 10,000 entries,
            8 MiB, and 24 hours. This does not enable sync or protected writes.
          </p>
          <label className="status-row">
            <span>Maximum entries (100–10,000)</span>
            <input
              type="number"
              min={100}
              max={10_000}
              step={100}
              value={retention.maxEntries}
              onChange={(event) =>
                setRetention({ ...retention, maxEntries: Number(event.target.value) })
              }
            />
          </label>
          <label className="status-row">
            <span>Maximum size (256 KiB–8 MiB)</span>
            <input
              type="number"
              min={262_144}
              max={8_388_608}
              step={262_144}
              value={retention.maxBytes}
              onChange={(event) =>
                setRetention({ ...retention, maxBytes: Number(event.target.value) })
              }
            />
          </label>
          <label className="status-row">
            <span>Retention (1–24 hours)</span>
            <input
              type="number"
              min={1}
              max={24}
              step={1}
              value={retention.retentionHours}
              onChange={(event) =>
                setRetention({ ...retention, retentionHours: Number(event.target.value) })
              }
            />
          </label>
          <button
            type="button"
            className="secondary-button"
            disabled={saving || busy}
            onClick={() => void saveRetention()}
          >
            {saving ? "Saving…" : "Save diagnostics limits"}
          </button>
        </div>
      )}
      <LocalDevicesPanel onSignIn={onSignIn} />
    </section>
  );
}
