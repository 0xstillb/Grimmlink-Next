import { useCallback, useEffect, useState } from "react";
import { DiagnosticsViewer } from "./DiagnosticsViewer.js";
import { JobsPanel } from "./JobsPanel.js";
import { OpfPreviewPanel } from "./OpfPreviewPanel.js";
import { SidecarPreviewPanel } from "./SidecarPreviewPanel.js";
import { UpdateCenter } from "./UpdateCenter.js";
import {
  createServerSupportBundle,
  fetchOwnerSession,
  fetchServerSupportBundle,
} from "./diagnostics-client.js";
import {
  DISCONNECTED,
  createSafeSupportBundle,
  inspectLocalAdapter,
  type LocalSnapshot,
  type SafeSupportBundle,
} from "./phase08-model.js";

export const sections = [
  "Overview",
  "OPF Sync",
  "Jobs",
  "Identity",
  "Reading",
  "Sidecar & Restore",
  "OPDS",
  "Logs & Diagnostics",
  "Settings & Devices",
  "Update Center",
] as const;
type Section = (typeof sections)[number];

export const sectionDescriptions: Record<Section, string> = {
  Overview: "Development readiness and the current offline safety boundary.",
  "OPF Sync": "Review source and metadata capabilities without scanning a live library.",
  Jobs: "Inspect job and event-stream availability without submitting work.",
  Identity: "Book-file identity and reader pairing status for the single owner.",
  Reading: "Position and Continue Reading status without inventing progress.",
  "Sidecar & Restore": "Backup and Sidecar capabilities in preview-only mode.",
  OPDS: "Subscription status without claiming full shelf membership sync.",
  "Logs & Diagnostics":
    "Inspect allow-listed process logs and use short owner-authorized diagnostic leases.",
  "Settings & Devices": "Private owner settings and paired-reader availability.",
  "Update Center": "Review bounded public release evidence without installing or rolling back.",
};

const cards = [
  ["Gateway", "DENY_ALL", "Official upstream traffic is disabled"],
  ["Reader sync", "OFF", "KOSync and personal bridges remain disabled"],
  ["Release", "NOT AUTHORIZED", "Phase 09 review and device tests required"],
] as const;

function PreviewPanel({
  title,
  badge = "Preview only",
  description,
  rows,
  actions,
  emptyState,
}: {
  title: string;
  badge?: string;
  description: string;
  rows?: ReadonlyArray<readonly [string, string]>;
  actions?: ReadonlyArray<string>;
  emptyState: string;
}) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>{title}</h2>
        <span className="pill">{badge}</span>
      </div>
      <p>{description}</p>
      {rows?.map(([label, value]) => (
        <div className="status-row" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
      {actions && actions.length > 0 && (
        <>
          <p className="preview-note" id="preview-action-note">
            Actions are disabled in this preview; no protected operation is submitted.
          </p>
          <div className="preview-actions" aria-label="Unavailable preview actions">
            {actions.map((action) => (
              <button
                className="secondary-button"
                type="button"
                key={action}
                disabled
                aria-describedby="preview-action-note"
              >
                {action}
              </button>
            ))}
          </div>
        </>
      )}
      <p className="empty-state">{emptyState}</p>
    </section>
  );
}

export function App({ initialSection = "Overview" }: { initialSection?: Section }) {
  const [selected, setSelected] = useState<Section>(initialSection);
  const [snapshot, setSnapshot] = useState<LocalSnapshot>(DISCONNECTED);
  const [checking, setChecking] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [supportBundle, setSupportBundle] = useState<SafeSupportBundle | null>(null);
  const [serverBundleState, setServerBundleState] = useState<
    "idle" | "creating" | "downloaded" | "failed"
  >("idle");
  const [serverBundleMessage, setServerBundleMessage] = useState(
    "Requires a signed-in local owner session.",
  );

  const refresh = useCallback(async (signal: AbortSignal) => {
    setChecking(true);
    const next = await inspectLocalAdapter(signal);
    if (!signal.aborted) {
      setSnapshot(next);
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  useEffect(() => {
    if (!supportBundle) return;
    const timer = window.setTimeout(
      () => {
        setSupportBundle(null);
        setCopyState("idle");
      },
      Math.max(0, supportBundle.expiresAtMs - Date.now()),
    );
    return () => window.clearTimeout(timer);
  }, [supportBundle]);

  const copyDiagnostics = async () => {
    try {
      const bundle = await createSafeSupportBundle(snapshot);
      setSupportBundle(bundle);
      await navigator.clipboard.writeText(bundle.text);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  };

  const downloadAuthenticatedBundle = async () => {
    if (serverBundleState === "creating") return;
    setServerBundleState("creating");
    setServerBundleMessage("Collecting the allow-listed server report.");
    try {
      const session = await fetchOwnerSession();
      if (!session.authenticated || !session.csrfToken) {
        setServerBundleState("failed");
        setServerBundleMessage("Sign in above before collecting a server support bundle.");
        return;
      }
      const receipt = await createServerSupportBundle(session.csrfToken);
      const bundle = await fetchServerSupportBundle(receipt.bundleId);
      if (bundle.checksum.value !== receipt.checksumSha256) {
        throw new Error("SUPPORT_BUNDLE_CHECKSUM_MISMATCH");
      }
      const objectUrl = URL.createObjectURL(
        new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" }),
      );
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `grimmlink-support-bundle-${receipt.bundleId}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
      setServerBundleState("downloaded");
      setServerBundleMessage(
        `Bundle downloaded; server retention expires at ${receipt.expiresAt}.`,
      );
    } catch {
      setServerBundleState("failed");
      setServerBundleMessage("Server bundle collection or download is unavailable.");
    }
  };

  return (
    <div className="app">
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            ✦
          </span>
          <span>
            GrimmLink <em>Next</em>
          </span>
        </div>
        <div className="workspace-label">
          PRIVATE WORKSPACE <span>01 OWNER</span>
        </div>
        <nav aria-label="Sections">
          {sections.map((label) => (
            <button
              type="button"
              key={label}
              className={selected === label ? "nav-item active" : "nav-item"}
              aria-current={selected === label ? "page" : undefined}
              onClick={() => {
                setSelected(label);
                setCopyState("idle");
                setSupportBundle(null);
                setServerBundleState("idle");
                setServerBundleMessage("Requires a signed-in local owner session.");
              }}
            >
              {label}
            </button>
          ))}
        </nav>
        <p className="side-note">
          Phase 08 · Offline development preview
          <br />
          No production connection
        </p>
      </aside>
      <main id="main-content" aria-labelledby="page-title">
        <header>
          <div>
            <p className="eyebrow">CONTROL CENTER / PHASE 08</p>
            <h1 id="page-title">{selected}</h1>
            <p className="muted">{sectionDescriptions[selected]}</p>
          </div>
          <div className="header-actions">
            <span className="state">
              {snapshot.observed ? "Local mock adapter" : "Not connected"}
            </span>
            <button
              className="secondary-button"
              type="button"
              disabled={checking}
              onClick={() => {
                const controller = new AbortController();
                void refresh(controller.signal);
              }}
            >
              {checking ? "Checking…" : "Refresh local status"}
            </button>
          </div>
        </header>
        <section className="notice" aria-label="Safety boundary">
          <strong>Development mode</strong>
          <span>
            All Official forwarding and protected writes remain OFF. No live data or updates are
            executed.
          </span>
        </section>

        {selected === "Overview" && (
          <>
            <section className="cards" aria-label="System status">
              <article className="card">
                <p className="card-label">Local adapter</p>
                <h2>{snapshot.observed ? "Mock API detected" : "Not connected"}</h2>
                <p>
                  {snapshot.observed
                    ? "Adapter v" + snapshot.adapterVersion + " · read-only local contract"
                    : "No verified local adapter response. No activity to display."}
                </p>
              </article>
              {cards.slice(0, 2).map(([title, value, description]) => (
                <article className="card" key={title}>
                  <p className="card-label">{title}</p>
                  <h2>{value}</h2>
                  <p>{description}</p>
                </article>
              ))}
            </section>
            <section className="panel">
              <div className="panel-heading">
                <h2>Project readiness</h2>
                <span className="pill">Mock-only</span>
              </div>
              <p>
                This preview does not certify phase exit gates. Check each phase handoff for
                verified code and CI evidence. Real Hermes, NAS and reader verification, the
                consolidated security review and release approval remain in Phase 09.
              </p>
              <div className="status-row">
                <span>Source</span>
                <strong>Local allow-listed diagnostics</strong>
              </div>
              <div className="status-row">
                <span>Actual device telemetry</span>
                <strong>Not available</strong>
              </div>
              <div className="status-row">
                <span>Production deployment</span>
                <strong>Not authorized</strong>
              </div>
            </section>
          </>
        )}

        {selected === "OPF Sync" && (
          <OpfPreviewPanel onSignIn={() => setSelected("Logs & Diagnostics")} />
        )}

        {selected === "Identity" && (
          <PreviewPanel
            title="Book identity and readers"
            description="Identity requires an exact book-file edition fingerprint. Pairing and revocation require a trusted owner session; no identifiers or reader inventory are connected here."
            rows={[
              ["Canonical owner", "Not observed"],
              ["Book-file mapping", "Not loaded"],
              ["Reader devices", "Not connected"],
              ["Pairing and revocation", "Unavailable"],
            ]}
            actions={["Pair a reader", "Revoke a reader"]}
            emptyState="No verified identity or device records to display"
          />
        )}

        {selected === "Reading" && (
          <PreviewPanel
            title="Continue Reading"
            description="Positions are never estimated from a title, timestamp or percent. Exact Resume requires a file-edition and text-anchor match; native reader positions remain untouched when a match cannot be proven."
            rows={[
              ["Resume position", "NO_POSITION"],
              ["Exact EPUB resume", "Not verified"],
              ["PDF page mapping", "Fixture-only"],
              ["Progress percent", "Not estimated"],
            ]}
            actions={["Refresh reading state", "Resolve a position"]}
            emptyState="No verified reading position is available"
          />
        )}

        {selected === "Sidecar & Restore" && (
          <SidecarPreviewPanel onSignIn={() => setSelected("Logs & Diagnostics")} />
        )}

        {selected === "OPDS" && (
          <PreviewPanel
            title="OPDS subscriptions"
            description="Subscription links and reader download sources are distinct from complete two-way shelf membership. No remote catalog or device account is queried here."
            rows={[
              ["Catalog connection", "Not connected"],
              ["Subscriptions", "Not loaded"],
              ["Shelf reconciliation", "Not supported by this preview"],
            ]}
            actions={["Add a subscription", "Refresh catalog"]}
            emptyState="No OPDS subscription data is available"
          />
        )}

        {selected === "Jobs" && <JobsPanel onSignIn={() => setSelected("Logs & Diagnostics")} />}

        {selected === "Logs & Diagnostics" && (
          <section className="panel" aria-label="Diagnostics">
            <div className="panel-heading">
              <h2>Logs and secret-safe diagnostics</h2>
              <span className="pill">Allow-list export</span>
            </div>
            <p>
              The viewer reads only allow-listed process events through the same-origin diagnostics
              API. Local owner login is available when the Adapter receives a password verifier and
              session key; it stays disabled if either value is missing. The support report below
              uses known local capability fields only.
            </p>
            <DiagnosticsViewer />
            <div className="status-row">
              <span>Diagnostics retention</span>
              <strong>In-memory safe events · Docker mock stdout rotates at 10 MiB × 3</strong>
            </div>
            <div className="status-row">
              <span>Local adapter</span>
              <strong>{snapshot.adapter}</strong>
            </div>
            <div className="status-row">
              <span>Official connection</span>
              <strong>{snapshot.official}</strong>
            </div>
            <div className="status-row">
              <span>Gateway forwarding</span>
              <strong>{snapshot.gateway}</strong>
            </div>
            <div className="status-row">
              <span>Personal bridge</span>
              <strong>{snapshot.personal}</strong>
            </div>
            <div className="status-row">
              <span>Native KOSync</span>
              <strong>{snapshot.nativeKosync}</strong>
            </div>
            <button className="primary-button" type="button" onClick={() => void copyDiagnostics()}>
              Copy safe support bundle
            </button>
            <button
              className="secondary-button"
              type="button"
              disabled={serverBundleState === "creating"}
              onClick={() => void downloadAuthenticatedBundle()}
            >
              {serverBundleState === "creating"
                ? "Collecting server bundle…"
                : "Download authenticated server bundle"}
            </button>
            <p role="status" aria-live="polite">
              {serverBundleMessage} Contains only allow-listed local status and up to 100 safe
              process events. The in-memory server copy expires after one hour.
            </p>
            <p className="bundle-expiry-note">
              The one-hour timer clears this page preview; copied text cannot be revoked.
            </p>
            <p role="status" aria-live="polite">
              {copyState === "copied" && supportBundle
                ? `Support bundle copied. This page preview expires at ${supportBundle.expiresAt}.`
                : copyState === "failed"
                  ? supportBundle
                    ? "Bundle preview is ready; clipboard access is unavailable."
                    : "Bundle generation or clipboard access is unavailable in this browser."
                  : "No device or backend details are collected."}
            </p>
            {supportBundle && (
              <details className="bundle-preview">
                <summary>Preview the allow-listed bundle</summary>
                <p>
                  SHA-256: <code>{supportBundle.checksumSha256}</code>
                </p>
                <pre>{supportBundle.text}</pre>
              </details>
            )}
          </section>
        )}

        {selected === "Update Center" && <UpdateCenter />}

        {selected === "Settings & Devices" && (
          <PreviewPanel
            title="Private settings and devices"
            description="The delivery policy is single-owner private with multiple individually paired readers. Authentication, pairing, revocation and protected settings require the trusted owner runtime, which is not connected."
            rows={[
              ["Workspace policy", "Single owner · private"],
              ["Owner session", "Not connected"],
              ["Reader inventory", "Not observed"],
              ["Gateway forwarding", "DENY_ALL"],
              ["Personal and session writes", "OFF"],
            ]}
            actions={["Sign in", "Pair a reader", "Rotate device token"]}
            emptyState="Settings remain read-only until owner authentication is available"
          />
        )}

        <footer>
          Preview statuses are not production health measurements. Phase 09 gates remain mandatory
          before live operations.
        </footer>
      </main>
    </div>
  );
}
