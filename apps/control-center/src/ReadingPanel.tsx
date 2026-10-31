import { useCallback, useEffect, useState } from "react";
import { DiagnosticsClientError, fetchOwnerSession } from "./diagnostics-client.js";
import { fetchLocalReading, type LocalReadingItem } from "./local-reading-client.js";

type State = "loading" | "ready" | "owner-required" | "unavailable" | "error";

function errorState(error: unknown): { state: State; message: string } {
  if (error instanceof DiagnosticsClientError && [401, 403].includes(error.status)) {
    return {
      state: "owner-required",
      message: "Sign in under Logs & Diagnostics to read the local progress snapshot.",
    };
  }
  if (error instanceof DiagnosticsClientError && error.status === 404) {
    return { state: "unavailable", message: "The local offline reading API is not enabled." };
  }
  return {
    state: "error",
    message: "The local reading snapshot could not be loaded; response details are hidden.",
  };
}

function positionLabel(item: LocalReadingItem): string {
  if (!item.position) return "No saved position";
  if (item.position.kind === "EPUB_EXACT") return `EPUB anchor: ${item.position.nativePosition}`;
  return `Fixture page ${item.position.pageNumber} of ${item.position.pageCount}`;
}

function evidenceLabel(item: LocalReadingItem): string {
  return item.position?.evidence ?? "No position evidence";
}

export function ReadingPanel({ onSignIn }: { onSignIn: () => void }) {
  const [items, setItems] = useState<readonly LocalReadingItem[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [state, setState] = useState<State>("loading");
  const [message, setMessage] = useState("Checking the authenticated local reading API.");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setBusy(true);
    try {
      const session = await fetchOwnerSession(signal);
      if (signal?.aborted) return;
      if (!session.authenticated) {
        setItems([]);
        setTruncated(false);
        setState("owner-required");
        setMessage("Sign in under Logs & Diagnostics to read the local progress snapshot.");
        return;
      }
      const snapshot = await fetchLocalReading(signal);
      if (signal?.aborted) return;
      setItems(snapshot.items);
      setTruncated(snapshot.truncated);
      setState("ready");
      setMessage("Local SQLite Phase06 data loaded. No reader is connected and no sync is active.");
    } catch (error) {
      if (signal?.aborted) return;
      const next = errorState(error);
      setItems([]);
      setTruncated(false);
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
    <section className="panel reading-panel" aria-label="Local Continue Reading">
      <div className="panel-heading">
        <h2>Continue Reading</h2>
        <span className="pill">Offline local preview</span>
      </div>
      <p>
        This owner-authenticated view reads Phase06 SQLite records only. It does not connect to
        KOReader, calculate reading percentages, open a book, or send progress to Official.
      </p>
      <div className="job-toolbar">
        <button
          type="button"
          className="secondary-button"
          disabled={busy}
          onClick={() => void refresh()}
        >
          {busy ? "Refreshing…" : "Refresh local reading"}
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
      {state === "ready" && items.length === 0 && (
        <p>No local Phase06 reading records are available.</p>
      )}
      {state === "ready" && truncated && (
        <p className="muted">
          Showing the first 100 records. Refresh after narrowing the local data.
        </p>
      )}
      {state === "ready" && items.length > 0 && (
        <div className="reading-list" aria-label="Local reading records">
          {items.map((item) => (
            <article className="reading-record" key={item.bookFileId}>
              <div className="reading-record-heading">
                <h3>{item.bookId}</h3>
                <span className="pill">
                  {item.status === "NO_POSITION" ? "No position" : "Local preview only"}
                </span>
              </div>
              <dl>
                <div className="status-row">
                  <dt>File ID</dt>
                  <dd>{item.bookFileId}</dd>
                </div>
                <div className="status-row">
                  <dt>Format</dt>
                  <dd>{item.format}</dd>
                </div>
                <div className="status-row">
                  <dt>Edition SHA-256</dt>
                  <dd>
                    <code>{item.editionSha256}</code>
                  </dd>
                </div>
                <div className="status-row">
                  <dt>Local revision</dt>
                  <dd>{item.revision}</dd>
                </div>
                <div className="status-row">
                  <dt>Position</dt>
                  <dd>{positionLabel(item)}</dd>
                </div>
                <div className="status-row">
                  <dt>Evidence</dt>
                  <dd>{evidenceLabel(item)}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}
      <p className="muted">
        Source: LOCAL_SQLITE_PHASE06_OFFLINE · Reader: NOT_CONNECTED · Official writes: OFF
      </p>
    </section>
  );
}
