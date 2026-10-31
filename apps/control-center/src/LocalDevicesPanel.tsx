import { useCallback, useEffect, useState } from "react";
import { DiagnosticsClientError, fetchOwnerSession } from "./diagnostics-client.js";
import {
  createLocalDevicePairing,
  fetchLocalDevices,
  revokeLocalDevice,
  rotateLocalDevice,
  type LocalDeviceToken,
  type LocalReaderDevice,
} from "./local-devices-client.js";

type State = "loading" | "ready" | "owner-required" | "unavailable" | "error";

function messageFor(error: unknown): { state: State; message: string } {
  if (error instanceof DiagnosticsClientError && [401, 403].includes(error.status)) {
    return {
      state: "owner-required",
      message: "Sign in under Logs & Diagnostics to manage local devices.",
    };
  }
  if (error instanceof DiagnosticsClientError && error.status === 404) {
    return { state: "unavailable", message: "The local paired-device API is not enabled." };
  }
  return {
    state: "error",
    message: "The local device operation failed; response details are hidden.",
  };
}

function expiryLabel(value: number): string {
  try {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Unknown" : date.toLocaleString();
  } catch {
    return "Unknown";
  }
}

export function LocalDevicesPanel({ onSignIn }: { onSignIn: () => void }) {
  const [devices, setDevices] = useState<readonly LocalReaderDevice[]>([]);
  const [state, setState] = useState<State>("loading");
  const [message, setMessage] = useState("Checking the authenticated local device inventory.");
  const [deviceId, setDeviceId] = useState("");
  const [expiresInDays, setExpiresInDays] = useState(30);
  const [busyDevice, setBusyDevice] = useState<string | null>(null);
  const [token, setToken] = useState<LocalDeviceToken | null>(null);
  const [tokenNotice, setTokenNotice] = useState("");

  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      const session = await fetchOwnerSession(signal);
      if (signal?.aborted) return;
      if (!session.authenticated) {
        setDevices([]);
        setState("owner-required");
        setMessage("Sign in under Logs & Diagnostics to manage local devices.");
        return;
      }
      const result = await fetchLocalDevices(signal);
      if (signal?.aborted) return;
      setDevices(result.devices);
      setState("ready");
      setMessage("Local SQLite inventory loaded. No reader connection or sync is active.");
    } catch (error) {
      if (signal?.aborted) return;
      const next = messageFor(error);
      setDevices([]);
      setState(next.state);
      setMessage(next.message);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  useEffect(() => {
    if (!token) return;
    const timer = window.setTimeout(() => {
      setToken(null);
      setTokenNotice("The one-time token was cleared from this view.");
    }, 60_000);
    return () => window.clearTimeout(timer);
  }, [token]);

  const runOwnerMutation = async (
    id: string,
    operation: (csrfToken: string) => Promise<LocalDeviceToken | void>,
  ) => {
    setBusyDevice(id);
    setToken(null);
    setTokenNotice("");
    try {
      const session = await fetchOwnerSession();
      if (!session.authenticated || !session.csrfToken) {
        setState("owner-required");
        setMessage("Sign in under Logs & Diagnostics before changing device state.");
        return;
      }
      const result = await operation(session.csrfToken);
      if (result) {
        setToken(result);
        setTokenNotice(
          "Copy this offline token now. It will not appear in the device list and clears after one minute.",
        );
      }
      setMessage("Local device state updated. No reader or Official service was contacted.");
      await refresh();
    } catch (error) {
      const next = messageFor(error);
      setState(next.state);
      setMessage(next.message);
    } finally {
      setBusyDevice(null);
    }
  };

  const createPairing = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedId = deviceId.trim();
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(normalizedId)) {
      setMessage("Use 1–128 letters, numbers, underscores or hyphens for the device ID.");
      return;
    }
    await runOwnerMutation(normalizedId, (csrfToken) =>
      createLocalDevicePairing(normalizedId, expiresInDays, csrfToken),
    );
  };

  const revoke = (device: LocalReaderDevice) =>
    void runOwnerMutation(device.deviceId, async (csrfToken) => {
      await revokeLocalDevice(device.deviceId, csrfToken);
    });

  const rotate = (device: LocalReaderDevice) =>
    void runOwnerMutation(device.deviceId, (csrfToken) =>
      rotateLocalDevice(device.deviceId, expiresInDays, csrfToken),
    );

  const copyToken = async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token.token);
      setTokenNotice(
        "One-time offline token copied. Store it securely; it will not be shown again.",
      );
    } catch {
      setTokenNotice("Clipboard access is unavailable. Copy the token manually before hiding it.");
    }
  };

  return (
    <section className="device-panel" aria-label="Owner paired reader devices">
      <div className="panel-heading">
        <h3>Paired reader devices</h3>
        <span className="pill">Offline local pairing</span>
      </div>
      <p>
        This inventory stores only token hashes. Pairing tokens are shown once for local preview;
        the KOReader plugin does not consume them yet and no device or sync connection is made.
      </p>
      <div className="job-toolbar">
        <button
          type="button"
          className="secondary-button"
          onClick={() => void refresh()}
          disabled={busyDevice !== null}
        >
          Refresh devices
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

      {state === "ready" && (
        <>
          <form className="device-form" onSubmit={(event) => void createPairing(event)}>
            <label>
              Device ID
              <input
                autoComplete="off"
                maxLength={128}
                pattern="[A-Za-z0-9_-]{1,128}"
                value={deviceId}
                onChange={(event) => setDeviceId(event.target.value)}
                required
              />
            </label>
            <label>
              Token validity (days)
              <input
                type="number"
                min={1}
                max={90}
                value={expiresInDays}
                onChange={(event) => setExpiresInDays(Number(event.target.value))}
                required
              />
            </label>
            <button className="primary-button" type="submit" disabled={busyDevice !== null}>
              {busyDevice === deviceId ? "Creating…" : "Create offline pairing token"}
            </button>
          </form>

          {token && (
            <div className="one-time-token" aria-label="One-time pairing token">
              <strong>
                {token.deviceId} · generation {token.generation}
              </strong>
              <code>{token.token}</code>
              <span>Expires {expiryLabel(token.expiresAtMs)}</span>
              <div className="job-toolbar">
                <button className="secondary-button" type="button" onClick={() => void copyToken()}>
                  Copy token
                </button>
                <button className="secondary-button" type="button" onClick={() => setToken(null)}>
                  Hide token
                </button>
              </div>
              <p role="status" aria-live="polite">
                {tokenNotice}
              </p>
            </div>
          )}

          {devices.length === 0 ? (
            <p className="empty-state">No local reader devices have been paired.</p>
          ) : (
            <div className="device-list">
              {devices.map((device) => (
                <article className="device-card" key={device.deviceId}>
                  <div className="status-row">
                    <strong>{device.deviceId}</strong>
                    <span className={`pill device-state ${device.state.toLowerCase()}`}>
                      {device.state}
                    </span>
                  </div>
                  <p>Token generation {device.generation}</p>
                  <p>Expires {expiryLabel(device.expiresAtMs)}</p>
                  {device.revokedAtMs !== null && <p>Revoked {expiryLabel(device.revokedAtMs)}</p>}
                  {device.state !== "REVOKED" && (
                    <div className="job-toolbar">
                      {device.state === "ACTIVE" && (
                        <button
                          className="secondary-button"
                          type="button"
                          disabled={busyDevice !== null}
                          onClick={() => rotate(device)}
                        >
                          {busyDevice === device.deviceId ? "Working…" : "Rotate token"}
                        </button>
                      )}
                      <button
                        className="secondary-button"
                        type="button"
                        disabled={busyDevice !== null}
                        onClick={() => revoke(device)}
                      >
                        Revoke
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
