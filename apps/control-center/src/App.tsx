import { useCallback, useEffect, useState } from "react";
import {
  DISCONNECTED,
  inspectLocalAdapter,
  safeDiagnosticExport,
  type LocalSnapshot,
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
  "Logs & Diagnostics": "Secret-safe diagnostics; live logs are not connected.",
  "Settings & Devices": "Private owner settings and paired-reader availability.",
  "Update Center": "Compatibility and update approval remain preview-only.",
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

  const copyDiagnostics = async () => {
    try {
      await navigator.clipboard.writeText(safeDiagnosticExport(snapshot));
      setCopyState("copied");
    } catch {
      setCopyState("failed");
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
          <PreviewPanel
            title="OPF metadata review"
            description="The preview does not mount or scan a NAS, read an OPF, or contact Grimmory. A future dry run must show exact source, target, field locks and collection diffs before any approved write."
            rows={[
              ["Source inventory", "Not observed"],
              ["Metadata mode", "Sparse preview only"],
              ["Metadata apply", "OFF"],
              ["Cover upload", "OFF"],
            ]}
            actions={["Inspect OPF", "Build dry run", "Apply approved changes"]}
            emptyState="No source books or metadata changes are loaded"
          />
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
          <PreviewPanel
            title="Sidecar and backup restore"
            description="Sidecar parsing and metadata-only backup verification have offline fixtures. This preview is not connected to a NAS, backup directory or Official restore API."
            rows={[
              ["NAS mount", "Not observed"],
              ["Sidecar import", "Preview-only"],
              ["Backup inventory", "Not loaded"],
              ["Restore apply", "OFF"],
            ]}
            actions={["Inspect Sidecar", "Verify backup", "Preview restore"]}
            emptyState="No backup or Sidecar files are being read"
          />
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

        {selected === "Jobs" && (
          <PreviewPanel
            title="Jobs and event stream"
            description="The Phase 04 queue, replay and recovery contracts have isolated tests. The production adapter does not mount this route factory, so there is no live queue or SSE stream to display."
            rows={[
              ["Queue state", "Not observed"],
              ["Event stream", "Unavailable"],
              ["Automatic retry", "Disabled"],
            ]}
            actions={["Pause jobs", "Resume jobs", "Retry failed job"]}
            emptyState="No job telemetry is connected"
          />
        )}

        {selected === "Logs & Diagnostics" && (
          <section className="panel" aria-label="Diagnostics">
            <div className="panel-heading">
              <h2>Logs and secret-safe diagnostics</h2>
              <span className="pill">Allow-list export</span>
            </div>
            <p>
              Server logs are not connected, so no log text or activity appears here. The report
              below is generated only from known local capability fields; credentials, notes, device
              IDs and library records are never exported.
            </p>
            <div className="status-row">
              <span>Live log viewer</span>
              <strong>Not connected</strong>
            </div>
            <div className="status-row">
              <span>Scoped DEBUG / TRACE</span>
              <strong>Unavailable</strong>
            </div>
            <div className="status-row">
              <span>Rotation and retention</span>
              <strong>Not configured by this UI</strong>
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
              Copy safe diagnostic report
            </button>
            <p role="status" aria-live="polite">
              {copyState === "copied"
                ? "Safe report copied."
                : copyState === "failed"
                  ? "Copy unavailable in this browser."
                  : "No device or backend details are collected."}
            </p>
            <p className="empty-state">
              No server logs, alerts or remote diagnostics were collected
            </p>
          </section>
        )}

        {selected === "Update Center" && (
          <PreviewPanel
            title="Update Center"
            description="Offline release and advisory payload parsers are covered by fixture tests, but this screen does not contact GitHub or download release metadata. Compatibility review, owner approval, install and rollback are not wired to this preview."
            rows={[
              ["Release payload validation", "Fixture-only parser · no feed fetched"],
              ["Advisory payload validation", "Fixture-only parser · no feed fetched"],
              ["Compatibility manifest", "Not loaded"],
              ["Compatibility assessment", "UNKNOWN · review required"],
              ["Installed runtime version", "Not verified"],
              ["Automatic update", "Disabled"],
              ["Release authorization", "NOT_AUTHORIZED"],
              ["Rollback", "Phase 09 verification required"],
            ]}
            actions={["Check for releases", "Review compatibility", "Approve installation"]}
            emptyState="No update has been fetched or applied"
          />
        )}

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
