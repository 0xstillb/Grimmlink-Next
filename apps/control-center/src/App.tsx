import { useState } from "react";
const sections = ["Overview", "Devices", "Jobs", "Diagnostics", "Settings"] as const;
export function App() {
  const [selected, setSelected] = useState<(typeof sections)[number]>("Overview");
  return (
    <div className="app">
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="brand"><span aria-hidden="true">✦</span><strong>GrimmLink <span>Next</span></strong></div>
        <nav aria-label="Sections">
          {sections.map((label) => (
            <button type="button" key={label} className={selected === label ? "nav-item active" : "nav-item"} aria-current={selected === label ? "page" : undefined} onClick={() => setSelected(label)}>
              {label}
            </button>
          ))}
        </nav>
        <p className="side-note">Phase 01 · Foundation only</p>
      </aside>
      <main id="main-content">
        <header><div><p className="eyebrow">CONTROL CENTER / FOUNDATION</p><h1>{selected}</h1><p className="muted">Local UI preview. No device or backend is connected.</p></div><span className="state">Not connected</span></header>
        {selected === "Overview" ? (<>
        <section className="cards" aria-label="System status">
          <article className="card"><p className="card-label">Adapter</p><h2>Not connected</h2><p>Phase 01 local shell only</p></article>
          <article className="card"><p className="card-label">Grimmory</p><h2>Disabled</h2><p>Gateway remains blocked until Phase 02</p></article>
          <article className="card"><p className="card-label">Sync</p><h2>Not running</h2><p>No reader, NAS or upstream calls</p></article>
        </section>
        <section className="panel"><h2>Activity</h2><p>No activity to display. Real counters and logs will appear only when their data sources are implemented and verified.</p></section>
        </>) : (<section className="panel" aria-live="polite"><h2>{selected} · Not available</h2><p>This view is a foundation placeholder. No live data or operations are available until later phases.</p></section>)}
        <footer>Nothing on this screen is a simulated device reading or a production health measurement.</footer>
      </main>
    </div>
  );
}
