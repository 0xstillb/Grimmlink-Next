import { useCallback, useEffect, useState } from "react";
import {
  DISCONNECTED,
  inspectLocalAdapter,
  safeDiagnosticExport,
  type LocalSnapshot,
} from "./phase08-model.js";

const sections = [
  "Overview",
  "Devices",
  "Jobs",
  "Diagnostics",
  "Update Center",
  "Settings",
] as const;
type Section = (typeof sections)[number];

const cards = [
  ["Gateway", "DENY_ALL", "Official upstream traffic is disabled"],
  ["Reader sync", "OFF", "KOSync and personal bridges remain disabled"],
  ["Release", "NOT AUTHORIZED", "Phase 09 review and device tests required"],
] as const;

export function App() {
  const [selected, setSelected] = useState<Section>("Overview");
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
      <main id="main-content">
        <header>
          <div>
            <p className="eyebrow">CONTROL CENTER / PHASE 08</p>
            <h1>{selected}</h1>
            <p className="muted">
              Private single-owner preview · no real reader or Official operations
            </p>
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
                Phases 01–07 have offline development deliverables. Real Hermes, NAS and reader
                verification, independent security review and release approval remain in Phase 09.
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

        {selected === "Devices" && (
          <section className="panel">
            <h2>Paired readers</h2>
            <p>
              No verified device inventory is connected to this preview. Pairing and revocation
              require a trusted owner session and are not exposed here.
            </p>
            <p className="empty-state">No device data to display</p>
          </section>
        )}

        {selected === "Jobs" && (
          <section className="panel">
            <h2>Local jobs</h2>
            <p>
              Phase 04 SQLite job and recovery primitives are tested with isolated fixtures. This UI
              does not read a live queue or submit jobs.
            </p>
            <p className="empty-state">No job telemetry to display</p>
          </section>
        )}

        {selected === "Diagnostics" && (
          <section className="panel" aria-label="Diagnostics">
            <div className="panel-heading">
              <h2>Secret-safe diagnostics</h2>
              <span className="pill">Allow-list export</span>
            </div>
            <p>
              Only known local capability fields are included. Credentials, server logs, notes,
              device IDs and library records are never exported.
            </p>
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
          </section>
        )}

        {selected === "Update Center" && (
          <section className="panel">
            <div className="panel-heading">
              <h2>Update Center</h2>
              <span className="pill">Preview only</span>
            </div>
            <p>
              Package artifacts are generated and checksummed by isolated CI. This page cannot
              download, install, roll back or schedule an update.
            </p>
            <div className="status-row">
              <span>UI package</span>
              <strong>Phase 08 development</strong>
            </div>
            <div className="status-row">
              <span>Installed runtime version</span>
              <strong>Not verified</strong>
            </div>
            <div className="status-row">
              <span>Auto-update</span>
              <strong>Disabled</strong>
            </div>
            <div className="status-row">
              <span>Rollback</span>
              <strong>Requires Phase 09 real restore test</strong>
            </div>
            <p className="empty-state">No update can be applied from this preview</p>
          </section>
        )}

        {selected === "Settings" && (
          <section className="panel">
            <h2>Private configuration</h2>
            <p>
              One canonical owner, multiple future paired readers. No multi-tenant roles or public
              sharing controls.
            </p>
            {cards.map(([title, value, description]) => (
              <div className="status-row" key={title}>
                <span>
                  {title} · {description}
                </span>
                <strong>{value}</strong>
              </div>
            ))}
            <p className="empty-state">
              Settings are read-only until trusted owner authentication is connected
            </p>
          </section>
        )}

        <footer>
          Preview statuses are not production health measurements. Phase 09 gates remain mandatory
          before live operations.
        </footer>
      </main>
    </div>
  );
}
