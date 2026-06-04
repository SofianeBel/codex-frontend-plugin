import React from "react";
import { useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

function App() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <main className="page-shell">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Visual feedback loop</p>
          <h1>Build frontend UIs that can check themselves.</h1>
          <p className="lede">
            Codex captures the local page, compares it with the mockup, and uses the report to tighten spacing,
            typography, color, and layout.
          </p>
          <div className="actions" aria-label="Primary actions">
            <button className="primary" type="button" onClick={() => setIsDialogOpen(true)}>Run visual check</button>
            <a className="secondary" href="#workflow">View workflow</a>
          </div>
        </div>
        <div className="report-card" id="report" aria-label="Visual report preview">
          <div className="score-row">
            <span>Visual match</span>
            <strong>97.8%</strong>
          </div>
          <div className="meter" aria-hidden="true">
            <span />
          </div>
          <ul>
            <li>Hero spacing within tolerance</li>
            <li>Button radius matches reference</li>
            <li>Typography scale aligned</li>
          </ul>
        </div>
      </section>
      <section className="workflow" id="workflow" aria-label="Workflow">
        <article>
          <span>01</span>
          <h2>Capture</h2>
          <p>Open the local app in a fixed viewport and save a deterministic screenshot.</p>
        </article>
        <article>
          <span>02</span>
          <h2>Compare</h2>
          <p>Normalize image dimensions and generate a pixel diff with a numeric score.</p>
        </article>
        <article>
          <span>03</span>
          <h2>Iterate</h2>
          <p>Feed the report back to Codex so the UI gets closer in small, verified passes.</p>
        </article>
      </section>
      {isDialogOpen && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="visual-check-title">
            <h2 id="visual-check-title">Visual check ready</h2>
            <p>The interface is made from semantic HTML, CSS, and real interactive controls.</p>
            <button type="button" onClick={() => setIsDialogOpen(false)}>Close</button>
          </section>
        </div>
      )}
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
