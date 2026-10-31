import { useCallback, useEffect, useState } from "react";
import {
  DiagnosticsClientError,
  fetchOwnerSession,
  fetchUpdateFeedSnapshot,
  fetchUpdateFeedSources,
  type UpdateFeedSnapshot,
} from "./diagnostics-client.js";

type FeedState = "loading" | "owner-required" | "unavailable" | "ready" | "error";

function statusFor(error: unknown): { state: FeedState; message: string } {
  if (error instanceof DiagnosticsClientError && error.status === 404) {
    return {
      state: "unavailable",
      message: "Update-feed routes are disabled or no sources are configured.",
    };
  }
  if (error instanceof DiagnosticsClientError && (error.status === 401 || error.status === 403)) {
    return { state: "owner-required", message: "Sign in under Logs & Diagnostics to continue." };
  }
  return { state: "error", message: "Release evidence could not be loaded; details are hidden." };
}

export function UpdateCenter() {
  const [state, setState] = useState<FeedState>("loading");
  const [message, setMessage] = useState("Checking local owner session and configured sources.");
  const [sourceIds, setSourceIds] = useState<readonly string[]>([]);
  const [sourceId, setSourceId] = useState("");
  const [snapshot, setSnapshot] = useState<UpdateFeedSnapshot | null>(null);
  const [busy, setBusy] = useState(false);

  const loadSources = useCallback(async (signal?: AbortSignal) => {
    try {
      const session = await fetchOwnerSession(signal);
      if (signal?.aborted) return;
      if (!session.authenticated) {
        setState("owner-required");
        setMessage("Sign in under Logs & Diagnostics before checking configured sources.");
        return;
      }
      const nextSources = await fetchUpdateFeedSources(signal);
      if (signal?.aborted) return;
      setSourceIds(nextSources);
      setSourceId((current) => (nextSources.includes(current) ? current : (nextSources[0] ?? "")));
      setState(nextSources.length > 0 ? "ready" : "unavailable");
      setMessage(
        nextSources.length > 0
          ? "Owner session verified. Fetching public GitHub evidence requires an explicit action."
          : "No URL-free update source is configured for this local Adapter.",
      );
    } catch (error) {
      if (signal?.aborted) return;
      const next = statusFor(error);
      setState(next.state);
      setMessage(next.message);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadSources(controller.signal);
    return () => controller.abort();
  }, [loadSources]);

  const checkRelease = async () => {
    if (!sourceId || state !== "ready" || busy) return;
    setBusy(true);
    setSnapshot(null);
    setMessage("Fetching bounded public release and advisory evidence from GitHub.");
    try {
      const next = await fetchUpdateFeedSnapshot(sourceId);
      setSnapshot(next);
      setMessage(
        "Evidence received. Payload authenticity, compatibility and impact are unverified.",
      );
    } catch (error) {
      const next = statusFor(error);
      setState(next.state);
      setMessage(next.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel update-center" aria-label="Update Center">
      <div className="panel-heading">
        <h2>Update Center</h2>
        <span className="pill">Evidence only</span>
      </div>
      <p>
        Fixture-tested release and advisory parsing is connected to the owner-authenticated,
        read-only GitHub feed. No release is downloaded or installed.
      </p>
      <div className="status-row">
        <span>Configured sources</span>
        <strong>{sourceIds.length > 0 ? sourceIds.join(", ") : "Not available"}</strong>
      </div>
      <div className="status-row">
        <span>Compatibility / impact</span>
        <strong>UNKNOWN / UNCLASSIFIED · review required</strong>
      </div>
      <div className="status-row">
        <span>Approval / installation</span>
        <strong>NOT_AUTHORIZED / DISABLED</strong>
      </div>
      {sourceIds.length > 0 && (
        <div className="preview-actions">
          <label>
            GitHub source
            <select
              value={sourceId}
              disabled={busy}
              onChange={(event) => {
                setSourceId(event.target.value);
                setSnapshot(null);
              }}
            >
              {sourceIds.map((id) => (
                <option value={id} key={id}>
                  {id}
                </option>
              ))}
            </select>
          </label>
          <button
            className="primary-button"
            type="button"
            disabled={busy || state !== "ready" || !sourceId}
            onClick={() => void checkRelease()}
          >
            {busy ? "Fetching evidence…" : "Fetch release evidence"}
          </button>
        </div>
      )}
      <button
        className="secondary-button"
        type="button"
        disabled={busy || state === "loading"}
        onClick={() => void loadSources()}
      >
        Refresh local source list
      </button>
      <p role="status" aria-live="polite">
        {message}
      </p>
      {snapshot ? (
        <div className="update-evidence" aria-label="Fetched release evidence">
          <h3>
            {snapshot.release.title} · {snapshot.release.tag}
          </h3>
          <p>
            Published {snapshot.release.publishedAt}; fetched {snapshot.fetchedAt}. Public payload
            is unverified.
          </p>
          <a href={snapshot.release.url} target="_blank" rel="noreferrer">
            View release page on GitHub
          </a>
          <div className="status-row">
            <span>Assets</span>
            <strong>{snapshot.release.assets.length} · not downloaded</strong>
          </div>
          <div className="status-row">
            <span>Published advisories</span>
            <strong>{snapshot.advisories.length} · payload unverified</strong>
          </div>
          {snapshot.advisories.length > 0 && (
            <ul className="update-advisories">
              {snapshot.advisories.map((advisory) => (
                <li key={advisory.id}>
                  <strong>
                    {advisory.id} · {advisory.severity.toUpperCase()}
                  </strong>
                  <span>{advisory.summary}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <p className="empty-state">No update has been fetched or applied</p>
      )}
      <p className="preview-note">
        The installed version is unattested. Compatibility manifests, impact classification, manual
        approval, asset downloads, installation and rollback are still unavailable.
      </p>
    </section>
  );
}
