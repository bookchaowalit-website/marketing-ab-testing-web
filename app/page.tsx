"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { SEED, STORAGE_KEY, addConversion, allocation as totalAllocation, conversionRate, parseVariants, pickLeader, setWeight, simulate, totals as sumTotals } from "@/lib/ab-testing";
import { createLocalStore } from "@/lib/local-store";

// Browser-only experiment state; the server render and first paint use the seed.
const store = createLocalStore(STORAGE_KEY, SEED, parseVariants);

export default function Home() {
  const variants = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  const allocation = totalAllocation(variants);
  const totals = sumTotals(variants);
  const leader = pickLeader(variants);
  const reset = () => store.set(SEED);

  return (
    <main className="experiment-room">
      <span className="contract-mark" dangerouslySetInnerHTML={{ __html: "<!-- THESIS: traffic is a question; FINISH: weighted allocation, honest rates, local experiment state -->" }} />
      <div className="room-shell">
        <header className="room-topbar">
          <Link href="/" className="room-wordmark">SPLIT / ROOM</Link>
          <span><i aria-hidden="true" /> local experiment · no visitors sent</span>
        </header>

        <section className="room-hero">
          <div>
            <p className="room-kicker">experiment 01 / weighting room</p>
            <h1>Let the traffic answer slowly.</h1>
          </div>
          <p className="room-deck">A small control room for comparing message variants. Adjust the split, simulate traffic, and read the rate without pretending this browser is a production analytics system.</p>
        </section>

        <section className="experiment-layout" aria-labelledby="experiment-heading">
          <div className="experiment-main">
            <header className="section-heading">
              <div><span className="section-code">01</span><h2 id="experiment-heading">The current split</h2></div>
              <span className={allocation === 100 ? "allocation-good" : "allocation-warning"}>{allocation}% allocated</span>
            </header>

            <div className="variant-list">
              {variants.map((variant, index) => {
                const rate = conversionRate(variant);
                return (
                  <article className="variant-row" key={variant.id}>
                    <div className="variant-index">0{index + 1}</div>
                    <div className="variant-content">
                      <div className="variant-title-line"><h3>{variant.name}</h3><strong>{rate.toFixed(1)}%</strong></div>
                      <div className="rate-track" aria-hidden="true"><span style={{ width: `${Math.min(rate * 8, 100)}%` }} /></div>
                      <div className="variant-facts"><span>{variant.views} exposures</span><span>{variant.conversions} conversions</span><label>weight <input aria-label={`${variant.name} traffic weight`} type="range" min="1" max="98" value={variant.weight} onChange={(event) => store.update((current) => setWeight(current, variant.id, Number(event.target.value)))} /> <b>{variant.weight}</b></label></div>
                    </div>
                    <button type="button" className="conversion-button" onClick={() => store.update((current) => addConversion(current, variant.id))}>+ conversion</button>
                  </article>
                );
              })}
            </div>

            <div className="room-actions">
              <button type="button" className="primary-button" onClick={() => store.update((current) => simulate(current, 1))}>Simulate one visit</button>
              <button type="button" className="quiet-button" onClick={() => store.update((current) => simulate(current, 50))}>Run 50 visits</button>
              <button type="button" className="text-button" onClick={reset}>Reset seed</button>
            </div>
            <p className="honesty-note">Simulation uses weighted random selection in this browser. It does not represent real audience behavior, statistical significance, or a deployed experiment.</p>
          </div>

          <aside className="readout" aria-label="Experiment readout">
            <span className="readout-label">Bench readout</span>
            <div className="readout-number">{totals.views}</div><p>total exposures</p>
            <dl>
              <div><dt>Conversions</dt><dd>{totals.conversions}</dd></div>
              <div><dt>Overall rate</dt><dd>{`${totals.rate.toFixed(1)}%`}</dd></div>
              <div><dt>Current lead</dt><dd>{leader?.name.split(" /")[0] ?? "—"}</dd></div>
            </dl>
            <div className="readout-rule" />
            <p className="readout-foot">The useful question is not “who won?” yet. It is “what changed, and what would make this result trustworthy?”</p>
          </aside>
        </section>

        <footer className="room-footer">Local-only portfolio instrument · no cookies, accounts, or external analytics are implied.</footer>
      </div>
    </main>
  );
}
