"use client";

import { useSyncExternalStore } from "react";
import { DashFoot, DashTop, Pill, Stat } from "@/components/dashboard-shell";
import { SEED, STORAGE_KEY, addConversion, allocation as totalAllocation, conversionRate, parseVariants, pickLeader, setWeight, simulate, totals as sumTotals } from "@/lib/ab-testing";
import { createLocalStore } from "@/lib/local-store";

// Browser-only experiment state; the server render and first paint use the seed.
const store = createLocalStore(STORAGE_KEY, SEED, parseVariants);
const SOURCE = "https://github.com/bookchaowalit-website/marketing-ab-testing-web";
const shortName = (name: string) => name.split(" /")[0];

export default function Home() {
  const variants = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  const allocation = totalAllocation(variants);
  const totals = sumTotals(variants);
  const leader = pickLeader(variants);
  const best = Math.max(0, ...variants.map(conversionRate));
  const tied = !leader && totals.conversions > 0;

  return (
    <div className="ds">
      <a className="ds-skip" href="#main">Skip to content</a>
      <DashTop name="A/B Testing" tagline="A local split-test bench" />

      <main id="main" tabIndex={-1} className="ds-main">
        <div className="ds-head">
          <div>
            <h1>Split test bench</h1>
            <p>Three message variants · simulated visits in this browser <Pill tone="grey">Simulated</Pill></p>
          </div>
        </div>

        <ul className="ds-stats" aria-label="Experiment at a glance">
          <Stat label="Exposures" value={totals.views.toLocaleString("en-US")} note="visits shown a variant" />
          <Stat label="Conversions" value={totals.conversions.toLocaleString("en-US")} note="added by hand" />
          <Stat label="Overall rate" value={totals.rate.toFixed(1)} unit="%" note="conversions per exposure" />
          <Stat label="Current lead" value={leader ? shortName(leader.name) : "—"} note={leader ? `${conversionRate(leader).toFixed(1)}% rate` : tied ? "tied, no leader yet" : "not enough data yet"} />
        </ul>

        <div className="ds-grid">
          <section className="ds-panel" aria-labelledby="variants-heading">
            <div className="ds-panel-head">
              <div>
                <h2 id="variants-heading">Variants</h2>
                <p>Rate per variant · bar is the rate against the best one</p>
              </div>
              <Pill tone={allocation === 100 ? "green" : "amber"}>{allocation}% allocated</Pill>
            </div>
            <ul className="ds-rows">
              {variants.map((variant) => {
                const rate = conversionRate(variant);
                const [title, angle] = variant.name.split(" / ");
                return (
                  <li key={variant.id} className="ds-row ab-variant">
                    <span className="ds-row-name">{title}</span>
                    <span className="ds-row-detail">{angle ? `${angle} · ` : ""}{variant.views} exposures · {variant.conversions} conversions</span>
                    <span className="ds-row-value">{rate.toFixed(1)}%</span>
                    <span className="ds-meter" aria-hidden="true"><span style={{ width: `${best ? Math.round((rate / best) * 100) : 0}%` }} /></span>
                    <div className="ab-controls">
                      <label className="ds-field ab-weight">
                        <span className="ds-field-row"><span>Traffic weight</span><b>{variant.weight}</b></span>
                        <input className="ds-range" aria-label={`${title} traffic weight`} type="range" min="1" max="98" value={variant.weight} onChange={(event) => store.update((current) => setWeight(current, variant.id, Number(event.target.value)))} />
                      </label>
                      <button type="button" className="ds-plain" aria-label={`Add a conversion to ${title}`} onClick={() => store.update((current) => addConversion(current, variant.id))}>Add conversion</button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="ds-panel ab-traffic" aria-labelledby="traffic-heading">
            <div className="ds-panel-head">
              <div>
                <h2 id="traffic-heading">Traffic</h2>
                <p>Each visit picks a variant by its weight</p>
              </div>
            </div>
            <div className="ds-actions">
              <button type="button" className="ds-button" onClick={() => store.update((current) => simulate(current, 1))}>Simulate one visit</button>
              <button type="button" className="ds-plain" onClick={() => store.update((current) => simulate(current, 50))}>Run 50 visits</button>
              <button type="button" className="ds-plain" onClick={() => store.set(SEED)}>Reset to sample</button>
            </div>
            <div className="ds-callout" aria-live="polite">
              {leader ? (
                <>
                  <strong>{shortName(leader.name)} leads for now</strong>
                  <span>{conversionRate(leader).toFixed(1)}% against {totals.rate.toFixed(1)}% overall. The useful question is not who won yet, but what would make this result trustworthy.</span>
                </>
              ) : (
                <>
                  <strong>No leader yet</strong>
                  <span>{tied ? "The best rate is shared, so no variant leads." : "No conversions yet. Add a conversion to a variant to compare rates."}</span>
                </>
              )}
            </div>
          </section>
        </div>

        <p className="ds-note">Simulation uses weighted random selection in this browser and is saved only here. It does not represent real audience behaviour, statistical significance or a deployed experiment. No cookies, accounts or analytics.</p>
      </main>

      <DashFoot source={SOURCE} />
    </div>
  );
}
