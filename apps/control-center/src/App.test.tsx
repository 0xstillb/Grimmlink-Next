import { it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { App } from "./App.js";
it("renders accessible navigation and real disconnected empty state", () => {
 const html=renderToStaticMarkup(<App />);
 expect(html).toContain('aria-label="Primary navigation"');
 expect(html).toContain('aria-current="page"');
 expect(html).toContain("<button");
 expect(html).toContain("Not connected");
 expect(html).toContain("No activity to display");
 expect(html).not.toContain("100% synced");
});
