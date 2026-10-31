import { it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { App, sectionDescriptions, sections } from "./App.js";

it("renders accessible navigation and real disconnected empty state", () => {
  const html = renderToStaticMarkup(<App />);
  expect(html).toContain('aria-label="Primary navigation"');
  expect(html).toContain('aria-current="page"');
  expect(html).toContain("<button");
  expect(html).toContain("Not connected");
  expect(html).toContain("No activity to display");
  expect(html).not.toContain("100% synced");
});

it("exposes every Phase08 product area with a scoped preview description", () => {
  expect(sections).toEqual([
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
  ]);
  expect(Object.keys(sectionDescriptions)).toEqual(sections);
  const expectedContent: Partial<Record<(typeof sections)[number], string>> = {
    "OPF Sync": "Choose one OPF file to inspect its metadata.",
    Identity: "No verified identity or device records to display",
    Reading: "No verified reading position is available",
    "Sidecar & Restore": "Choose one Sidecar JSON file to inspect its metadata.",
    OPDS: "No OPDS subscription data is available",
    "Logs & Diagnostics": "No diagnostic log text is displayed.",
    "Settings & Devices": "Checking the authenticated local security policy API.",
    "Update Center": "No update has been fetched or applied",
  };

  for (const section of sections) {
    const html = renderToStaticMarkup(<App initialSection={section} />);
    expect(html).toContain(section.replace(/&/g, "&amp;"));
    expect(html).toContain("All Official forwarding and protected writes remain OFF");
    expect(html).not.toContain("100% synced");
    const expected = expectedContent[section];
    if (expected) {
      expect(html).toContain(expected);
      if (
        section !== "Logs & Diagnostics" &&
        section !== "OPF Sync" &&
        section !== "Sidecar & Restore" &&
        section !== "Settings & Devices"
      )
        expect(html).toContain("disabled=");
    }
    if (section === "OPF Sync") {
      expect(html).toContain('type="file"');
      expect(html).toContain("Read-only · no NAS");
      expect(html).toContain("parsed in memory and discarded");
    }
    if (section === "Sidecar & Restore") {
      expect(html).toContain("Sidecar JSON file");
      expect(html).toContain("Sidecar imports");
      expect(html).toContain("Adjacent file writes");
      expect(html).toContain("parsed in memory and discarded");
    }
    if (section === "Settings & Devices") {
      expect(html).toContain("Read-only policy");
      expect(html).toContain("Refresh policy");
      expect(html).toContain("does not prove that a deployment");
    }
    if (section === "Jobs") {
      expect(html).toContain("Checking the authenticated local job API.");
      expect(html).toContain("DISABLED · no worker");
      expect(html).toContain("Official writes");
      expect(html).toContain("Recent queue events");
    }
    if (section === "Update Center") {
      expect(html).toContain("Evidence only");
      expect(html).toContain("UNKNOWN / UNCLASSIFIED · review required");
      expect(html).toContain("NOT_AUTHORIZED");
      expect(html).toContain("No update has been fetched or applied");
      expect(html).toContain("Review compatibility");
      expect(html).toContain("Approve installation");
    }
    if (section === "Logs & Diagnostics") {
      expect(html).toContain("Copy safe support bundle");
      expect(html).toContain("Download authenticated server bundle");
      expect(html).toContain("copied text cannot be revoked");
      expect(html).toContain("Live diagnostics");
      expect(html).toContain("Enable DEBUG");
      expect(html).toContain("disabled=");
    }
  }
});
