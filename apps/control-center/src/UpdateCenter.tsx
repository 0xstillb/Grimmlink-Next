import { useCallback, useEffect, useState } from "react";
import {
  DiagnosticsClientError,
  fetchOwnerSession,
  fetchUpdateFeedSnapshot,
  fetchUpdateFeedSources,
  fetchUpdateReviews,
  submitUpdateReview,
  type UpdateReviewCompatibility,
  type UpdateReviewDecision,
  type UpdateReviewImpact,
  type UpdateReviewInput,
  type UpdateReviewRecord,
  type CompatibilityManifest,
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
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [reviews, setReviews] = useState<readonly UpdateReviewRecord[]>([]);
  const [compatibilityManifest, setCompatibilityManifest] = useState<CompatibilityManifest | null>(
    null,
  );
  const [compatibilityManifestSha256, setCompatibilityManifestSha256] = useState<string | null>(
    null,
  );
  const [compatibility, setCompatibility] = useState<UpdateReviewCompatibility>("UNKNOWN");
  const [impact, setImpact] = useState<UpdateReviewImpact>("UNKNOWN");
  const [decision, setDecision] = useState<UpdateReviewDecision>("DEFERRED");
  const [rationale, setRationale] = useState("");
  const [busy, setBusy] = useState(false);

  const loadSources = useCallback(async (signal?: AbortSignal) => {
    try {
      const session = await fetchOwnerSession(signal);
      if (signal?.aborted) return;
      if (!session.authenticated) {
        setCsrfToken(null);
        setState("owner-required");
        setMessage("Sign in under Logs & Diagnostics before checking configured sources.");
        return;
      }
      setCsrfToken(session.csrfToken);
      const nextSources = await fetchUpdateFeedSources(signal);
      if (signal?.aborted) return;
      setSourceIds(nextSources);
      const reviewState = await fetchUpdateReviews(signal);
      if (signal?.aborted) return;
      setReviews(reviewState.reviews);
      setCompatibilityManifest(reviewState.compatibilityManifest);
      setCompatibilityManifestSha256(reviewState.compatibilityManifestSha256);
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

  const recordOwnerReview = async () => {
    if (!snapshot || !csrfToken || !compatibilityManifestSha256 || busy) return;
    const input: UpdateReviewInput = {
      sourceId: snapshot.sourceId,
      candidateTag: snapshot.release.tag,
      evidenceSha256: snapshot.evidenceSha256,
      compatibilityManifestSha256,
      compatibility,
      impact,
      decision,
      rationale,
    };
    setBusy(true);
    setMessage("Rechecking the exact public evidence and recording the owner review.");
    try {
      const review = await submitUpdateReview(input, csrfToken);
      setReviews((current) => [review, ...current].slice(0, 50));
      setMessage(
        "Owner review recorded for this evidence hash. It does not authorize installation or rollback.",
      );
    } catch (error) {
      const next = statusFor(error);
      setMessage(
        error instanceof DiagnosticsClientError && error.status === 409
          ? "The feed evidence or compatibility manifest changed. Refresh both before recording a review."
          : next.message,
      );
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
      {compatibilityManifest && compatibilityManifestSha256 && (
        <details className="update-compatibility-manifest">
          <summary>
            Compatibility manifest · deployed versions unknown · SHA-256{" "}
            {compatibilityManifestSha256}
          </summary>
          <p>
            {compatibilityManifest.status.replaceAll("_", " ")}. This lists audited source baselines
            and does not verify installed binaries or runtime compatibility.
          </p>
          <ul>
            {compatibilityManifest.components.map((component) => (
              <li key={component.id}>
                <strong>{component.id}</strong>
                <span>
                  Source{" "}
                  {component.auditedSourceVersion ??
                    component.observedRelease ??
                    component.declaredSourceVersion ??
                    "unknown"}
                  {" · deployed: unknown · "}
                  {component.evidence}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
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
          <p>
            Evidence SHA-256: <code>{snapshot.evidenceSha256}</code>
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
        Owner review records are linked to exact public evidence and this compatibility manifest.
        Installed versions remain unattested; review does not authorize an update.
      </p>
      <p className="preview-note" id="update-action-note">
        Review and installation controls stay disabled until compatibility evidence and the Phase09
        release gates are complete.
      </p>
      {snapshot && (
        <div className="update-review-form" aria-label="Manual owner review">
          <h3>Record owner review</h3>
          <p>
            This records a manual classification against the displayed evidence hash. Installed
            runtime versions are still unknown. A Phase 09 evaluation decision is not install or
            production approval.
          </p>
          <label>
            Compatibility with documented source baseline
            <select
              value={compatibility}
              disabled={busy}
              onChange={(event) =>
                setCompatibility(event.target.value as UpdateReviewCompatibility)
              }
            >
              <option value="UNKNOWN">Unknown — evidence incomplete</option>
              <option value="SOURCE_BASELINE_REVIEWED_COMPATIBLE">
                Reviewed against source baseline
              </option>
              <option value="INCOMPATIBLE">Incompatible</option>
            </select>
          </label>
          <label>
            Impact classification
            <select
              value={impact}
              disabled={busy}
              onChange={(event) => setImpact(event.target.value as UpdateReviewImpact)}
            >
              <option value="UNKNOWN">Unknown</option>
              <option value="NO_KNOWN_SOURCE_IMPACT">No known source impact</option>
              <option value="POTENTIAL_IMPACT">Potential impact</option>
            </select>
          </label>
          <label>
            Owner decision
            <select
              value={decision}
              disabled={busy}
              onChange={(event) => setDecision(event.target.value as UpdateReviewDecision)}
            >
              <option value="DEFERRED">Defer</option>
              <option value="REJECTED">Reject candidate</option>
              <option value="SUBMIT_FOR_PHASE09_EVALUATION">Submit for Phase 09 evaluation</option>
            </select>
          </label>
          <label>
            Review rationale (20–500 characters; do not include secrets or private book data)
            <textarea
              value={rationale}
              maxLength={500}
              disabled={busy}
              onChange={(event) => setRationale(event.target.value)}
            />
          </label>
          <button
            className="primary-button"
            type="button"
            disabled={
              busy ||
              !csrfToken ||
              !compatibilityManifestSha256 ||
              rationale.trim().length < 20 ||
              (decision === "SUBMIT_FOR_PHASE09_EVALUATION" &&
                (compatibility !== "SOURCE_BASELINE_REVIEWED_COMPATIBLE" ||
                  impact !== "NO_KNOWN_SOURCE_IMPACT"))
            }
            onClick={() => void recordOwnerReview()}
          >
            {busy ? "Recording review…" : "Recheck evidence and record review"}
          </button>
        </div>
      )}
      {reviews.length > 0 && (
        <div className="update-review-history" aria-label="Recent owner review records">
          <h3>Recent owner review records</h3>
          <ul>
            {reviews.slice(0, 10).map((review) => (
              <li key={review.id}>
                <strong>
                  {review.candidateTag} · {review.decision.replaceAll("_", " ")}
                </strong>
                <span>
                  {new Date(review.reviewedAt).toISOString()} · {review.compatibility} ·{" "}
                  {review.impact}
                </span>
                <code>{review.evidenceSha256}</code>
                <span>Manifest SHA-256: {review.compatibilityManifestSha256}</span>
                <span>{review.rationale}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="preview-actions" aria-label="Unavailable release actions">
        <button
          className="secondary-button"
          type="button"
          disabled
          aria-describedby="update-action-note"
        >
          Review compatibility
        </button>
        <button
          className="secondary-button"
          type="button"
          disabled
          aria-describedby="update-action-note"
        >
          Approve installation
        </button>
        <button
          className="secondary-button"
          type="button"
          disabled
          aria-describedby="update-action-note"
        >
          Install / rollback
        </button>
      </div>
    </section>
  );
}
