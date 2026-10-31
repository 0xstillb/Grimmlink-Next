import { useCallback, useEffect, useState } from "react";
import { DiagnosticsClientError, fetchOwnerSession } from "./diagnostics-client.js";
import { fetchLocalScreenStatus, type LocalScreenStatus } from "./local-screen-status-client.js";

export type DomainScreen = "Identity" | "Reading" | "OPDS";
type StatusKey = "identity" | "reading" | "opds";
type ConnectionState = "loading" | "ready" | "owner-required" | "unavailable" | "error";

const config: Readonly<
  Record<
    DomainScreen,
    Readonly<{ key: StatusKey; title: string; description: string; actions: string[] }>
  >
> = {
  Identity: {
    key: "identity",
    title: "Book identity and readers",
    description:
      "Exact book-file identity and paired-reader management require a trusted identity provider. No reader inventory or pairing action is fabricated here.",
    actions: ["Pair a reader", "Revoke a reader"],
  },
  Reading: {
    key: "reading",
    title: "Continue Reading",
    description:
      "Exact Resume requires a verified file edition and text anchor. No position is estimated from a title, timestamp or percentage.",
    actions: ["Refresh reading state", "Resolve a position"],
  },
  OPDS: {
    key: "opds",
    title: "OPDS subscriptions",
    description:
      "Catalog subscriptions are distinct from two-way shelf membership. No remote catalog or device account is queried here.",
    actions: ["Add a subscription", "Refresh catalog"],
  },
};

function errorState(error: unknown): { state: ConnectionState; message: string } {
  if (error instanceof DiagnosticsClientError && [401, 403].includes(error.status)) {
    return {
      state: "owner-required",
      message: "Sign in under Logs & Diagnostics to read the local provider status.",
    };
  }
  if (error instanceof DiagnosticsClientError && error.status === 404) {
    return {
      state: "unavailable",
      message: "The owner-authenticated screen status API is not enabled.",
    };
  }
  return {
    state: "error",
    message: "Provider status could not be loaded; response details are hidden.",
  };
}

export function UnavailableDomainPanel({
  screen,
  onSignIn,
}: {
  screen: DomainScreen;
  onSignIn: () => void;
}) {
  const details = config[screen];
  const [snapshot, setSnapshot] = useState<LocalScreenStatus | null>(null);
  const [state, setState] = useState<ConnectionState>("loading");
  const [message, setMessage] = useState("Checking the authenticated local screen status API.");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setBusy(true);
    try {
      const session = await fetchOwnerSession(signal);
      if (signal?.aborted) return;
      if (!session.authenticated) {
        setSnapshot(null);
        setState("owner-required");
        setMessage("Sign in under Logs & Diagnostics to read the local provider status.");
        return;
      }
      const next = await fetchLocalScreenStatus(signal);
      if (signal?.aborted) return;
      setSnapshot(next);
      setState("ready");
      setMessage("Adapter reports this provider is unavailable; no domain data was queried.");
    } catch (error) {
      if (signal?.aborted) return;
      const next = errorState(error);
      setSnapshot(null);
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

  const provider = snapshot?.[details.key];
  return (
    <section className="panel domain-status-panel" aria-label={`${screen} provider status`}>
      <div className="panel-heading">
        <h2>{details.title}</h2>
        <span className="pill">Provider unavailable</span>
      </div>
      <p>{details.description}</p>
      <div className="job-toolbar">
        <button
          type="button"
          className="secondary-button"
          disabled={busy}
          onClick={() => void refresh()}
        >
          {busy ? "Refreshing…" : "Refresh provider status"}
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
      {state === "ready" && snapshot && provider && (
        <div className="settings-policy" aria-label={`${screen} data availability`}>
          <div className="status-row">
            <span>Data source</span>
            <strong>{snapshot.source}</strong>
          </div>
          <div className="status-row">
            <span>Availability</span>
            <strong>{provider.status}</strong>
          </div>
          <div className="status-row">
            <span>Reason</span>
            <strong>{provider.reason}</strong>
          </div>
        </div>
      )}
      <div className="job-actions" aria-label="Unavailable domain actions">
        {details.actions.map((action) => (
          <button type="button" className="secondary-button" disabled key={action}>
            {action}
          </button>
        ))}
      </div>
      {state === "ready" && <p className="empty-state">No verified {screen} data to display.</p>}
    </section>
  );
}
