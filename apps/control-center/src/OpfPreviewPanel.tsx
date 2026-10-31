import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { DiagnosticsClientError, fetchOwnerSession } from "./diagnostics-client.js";
import { previewOwnerSelectedOpf, type LocalOpfPreview } from "./local-opf-client.js";

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

export function OpfPreviewPanel({ onSignIn }: { onSignIn: () => void }) {
  const [state, setState] = useState<PreviewState>("idle");
  const [message, setMessage] = useState("Choose one OPF file to inspect its metadata.");
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<LocalOpfPreview | null>(null);
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
      setMessage("Choose one OPF file to inspect its metadata.");
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
        setMessage("Sign in under Logs & Diagnostics before uploading an OPF preview.");
        return;
      }
      const next = await previewOwnerSelectedOpf(file, session.csrfToken, controller.signal);
      if (controller.signal.aborted) return;
      setPreview(next);
      setState("ready");
      setMessage("OPF parsed in memory. No NAS access, file retention or metadata write occurred.");
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
            ? "Owner-authenticated OPF preview is not enabled in this Adapter."
            : "The selected OPF could not be previewed; source details are not retained.",
      );
    }
  };

  return (
    <section className="panel opf-panel" aria-label="Owner-selected OPF metadata preview">
      <div className="panel-heading">
        <h2>OPF metadata review</h2>
        <span className="pill">Read-only · no NAS</span>
      </div>
      <p>
        Select one UTF-8 OPF file from your device. The file is sent to the same-origin local
        Adapter, parsed in memory and discarded. This does not scan a library, contact Grimmory or
        write metadata.
      </p>
      <label className="opf-file-picker">
        OPF file
        <input
          type="file"
          accept=".opf,application/oebps-package+xml,application/xml,text/xml"
          onChange={(event) => void inspect(event)}
        />
      </label>
      <p role="status" aria-live="polite">
        {message}
      </p>
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
          <div className="status-row">
            <span>Write permission</span>
            <strong>OFF · preview only</strong>
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
          <div className="status-row">
            <span>Cover reference</span>
            <strong>{preview.coverHref ?? "Not declared"}</strong>
          </div>
        </div>
      )}
    </section>
  );
}
