import { useCallback, useEffect, useState } from "react";
import { DiagnosticsClientError, fetchOwnerSession } from "./diagnostics-client.js";
import { fetchLocalDevices, type LocalReaderDevice } from "./local-devices-client.js";
import { fetchLocalIdentity, type LocalIdentityRegistration } from "./local-identity-client.js";

type State = "loading" | "ready" | "owner-required" | "unavailable" | "error";

function errorState(error: unknown): { state: State; message: string } {
  if (error instanceof DiagnosticsClientError && [401, 403].includes(error.status)) {
    return {
      state: "owner-required",
      message: "Sign in under Logs & Diagnostics to read local identities and readers.",
    };
  }
  if (error instanceof DiagnosticsClientError && error.status === 404) {
    return { state: "unavailable", message: "The local identity API is not enabled." };
  }
  return {
    state: "error",
    message: "Local identity data could not be loaded; response details are hidden.",
  };
}

function expiryLabel(value: number): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown" : date.toLocaleString();
}

function expiryIso(value: number): string | undefined {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function IdentityPanel({
  onSignIn,
  onManageDevices,
}: {
  onSignIn: () => void;
  onManageDevices: () => void;
}) {
  const [identities, setIdentities] = useState<readonly LocalIdentityRegistration[]>([]);
  const [devices, setDevices] = useState<readonly LocalReaderDevice[]>([]);
  const [identityTruncated, setIdentityTruncated] = useState(false);
  const [state, setState] = useState<State>("loading");
  const [message, setMessage] = useState("Checking the authenticated local identity API.");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setBusy(true);
    try {
      const session = await fetchOwnerSession(signal);
      if (signal?.aborted) return;
      if (!session.authenticated) {
        setIdentities([]);
        setDevices([]);
        setIdentityTruncated(false);
        setState("owner-required");
        setMessage("Sign in under Logs & Diagnostics to read local identities and readers.");
        return;
      }
      const [identitySnapshot, deviceSnapshot] = await Promise.all([
        fetchLocalIdentity(signal),
        fetchLocalDevices(signal),
      ]);
      if (signal?.aborted) return;
      setIdentities(identitySnapshot.items);
      setIdentityTruncated(identitySnapshot.truncated);
      setDevices(deviceSnapshot.devices);
      setState("ready");
      setMessage(
        "Local SQLite registrations loaded. Official ownership and reader sync are unverified.",
      );
    } catch (error) {
      if (signal?.aborted) return;
      const next = errorState(error);
      setIdentities([]);
      setDevices([]);
      setIdentityTruncated(false);
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
    <section className="panel identity-panel" aria-label="Local book identity and paired readers">
      <div className="panel-heading">
        <h2>Book identity and readers</h2>
        <span className="pill">Local registration only</span>
      </div>
      <p>
        These records are local Phase05 registrations bound to a KOReader document hash, file ID and
        edition digest. They do not prove Official ownership or entitlement. Reader pairing tokens
        remain private and are never shown in this inventory.
      </p>
      <div className="job-toolbar">
        <button
          type="button"
          className="secondary-button"
          disabled={busy}
          onClick={() => void refresh()}
        >
          {busy ? "Refreshing…" : "Refresh identity"}
        </button>
        <button type="button" className="secondary-button" onClick={onManageDevices}>
          Manage pairing in Settings &amp; Devices
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
      {state === "ready" && identities.length === 0 && (
        <p>No local book identity registrations are available.</p>
      )}
      {state === "ready" && identityTruncated && (
        <p className="muted">Showing the first 100 identity registrations.</p>
      )}
      {state === "ready" && identities.length > 0 && (
        <div className="identity-list" aria-label="Local identity registrations">
          {identities.map((identity) => (
            <article className="identity-record" key={identity.koDocumentMd5}>
              <div className="reading-record-heading">
                <h3>{identity.bookFileId}</h3>
                <span className="pill">{identity.localWriterMode}</span>
              </div>
              <dl>
                <div className="status-row">
                  <dt>KO document MD5</dt>
                  <dd>
                    <code>{identity.koDocumentMd5}</code>
                  </dd>
                </div>
                <div className="status-row">
                  <dt>Edition SHA-256</dt>
                  <dd>
                    <code>{identity.editionSha256}</code>
                  </dd>
                </div>
                <div className="status-row">
                  <dt>Local revision</dt>
                  <dd>{identity.revision}</dd>
                </div>
                <div className="status-row">
                  <dt>Identity evidence</dt>
                  <dd>{identity.identityEvidence}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}
      <section className="identity-readers" aria-label="Paired local readers">
        <div className="panel-heading">
          <h3>Paired readers</h3>
          <span className="pill">Local token hashes only</span>
        </div>
        {state === "ready" && devices.length === 0 && <p>No readers are paired locally.</p>}
        {state === "ready" && devices.length > 0 && (
          <ul className="identity-device-list">
            {devices.map((device) => (
              <li key={device.deviceId}>
                <strong>{device.deviceId}</strong>
                <span>{device.state}</span>
                <span>Token generation {device.generation}</span>
                <time dateTime={expiryIso(device.expiresAtMs)}>
                  Expires {expiryLabel(device.expiresAtMs)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="muted">
        Source: LOCAL_SQLITE_PHASE05_OFFLINE · Official ownership: NOT_VERIFIED · Official writes:
        OFF
      </p>
    </section>
  );
}
