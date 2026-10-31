import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { DiagnosticsClientError, fetchOwnerSession } from "./diagnostics-client.js";
import { previewOwnerSelectedSidecar, type LocalSidecarPreview } from "./local-sidecar-client.js";

type PreviewState = "idle" | "loading" | "ready" | "owner-required" | "unavailable" | "error";

const labels: Readonly<Record<string, string>> = {
  title: "Title",
  subtitle: "Subtitle",
  publisher: "Publisher",
  publishedDate: "Published date",
  description: "Description",
  seriesName: "Series",
  seriesNumber: "Series number",
  isbn13: "ISBN-13",
  isbn10: "ISBN-10",
  language: "Language",
};

export function SidecarPreviewPanel({ onSignIn }: { onSignIn: () => void }) {
  const [state, setState] = useState<PreviewState>("idle");
  const [message, setMessage] = useState("Choose one Sidecar JSON file to inspect its metadata.");
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<LocalSidecarPreview | null>(null);
  const request = useRef<AbortController | null>(null);

  useEffect(() => () => request.current?.abort(), []);

  const inspect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    request.current?.abort();
    setPreview(null);
    setFileName(file?.name ?? "");
    if (!file) {
      setState("idle");
      setMessage("Choose one Sidecar JSON file to inspect its metadata.");
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    setState("loading");
    setMessage("Checking the local owner session before parsing the selected file.");
    try {
      const session = await fetchOwnerSession(controller.signal);
      if (controller.signal.aborted) return;
      if (!session.authenticated || !session.csrfToken) {
        setState("owner-required");
        setMessage("Sign in under Logs & Diagnostics before uploading a Sidecar preview.");
        return;
      }
      const next = await previewOwnerSelectedSidecar(file, session.csrfToken, controller.signal);
      if (controller.signal.aborted) return;
      setPreview(next);
      setState("ready");
      setMessage("Sidecar parsed in memory. Imports and adjacent writes remain disabled.");
    } catch (error) {
      if (controller.signal.aborted) return;
      const nextState =
        error instanceof DiagnosticsClientError && [401, 403].includes(error.status)
          ? "owner-required"
          : error instanceof DiagnosticsClientError && error.status === 404
            ? "unavailable"
            : "error";
      setState(nextState);
      setMessage(
        nextState === "owner-required"
          ? "The local owner session expired. Sign in again before previewing the file."
          : nextState === "unavailable"
            ? "Owner-authenticated Sidecar preview is not enabled in this Adapter."
            : "The selected Sidecar could not be previewed; source details are not retained.",
      );
    }
  };

  return (
    <section className="panel opf-panel" aria-label="Owner-selected Sidecar metadata preview">
      <div className="panel-heading">
        <h2>Sidecar and backup preview</h2>
        <span className="pill">Read-only · no NAS</span>
      </div>
      <p>
        Select one Sidecar JSON file from your device. It is sent to the same-origin local Adapter,
        parsed in memory and discarded. This does not scan a library, restore a backup or contact
        Grimmory.
      </p>
      <label className="opf-file-picker">
        Sidecar JSON file
        <input
          type="file"
          accept=".json,application/json"
          onChange={(event) => void inspect(event)}
        />
      </label>
      <p role="status" aria-live="polite">
        {message}
      </p>
      <div className="sidecar-safety" aria-label="Sidecar action permissions">
        <div className="status-row">
          <span>Sidecar imports</span>
          <strong>OFF · preview only</strong>
        </div>
        <div className="status-row">
          <span>Adjacent file writes</span>
          <strong>OFF</strong>
        </div>
      </div>
      {state === "owner-required" && (
        <button className="secondary-button" type="button" onClick={onSignIn}>
          Go to owner sign-in
        </button>
      )}
      {preview && (
        <div className="opf-result">
          <div className="status-row">
            <span>Selected source</span>
            <strong>{fileName}</strong>
          </div>
          {Object.entries(preview.metadata).length > 0 ? (
            <dl className="opf-metadata">
              {Object.entries(preview.metadata).map(([key, value]) => (
                <div key={key}>
                  <dt>{labels[key] ?? key}</dt>
                  <dd>{String(value)}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="empty-state">No supported sparse metadata fields were found.</p>
          )}
        </div>
      )}
    </section>
  );
}
