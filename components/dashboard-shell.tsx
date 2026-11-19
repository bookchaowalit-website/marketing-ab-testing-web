import type { ReactNode } from "react";

/**
 * Dashboard shell building blocks (styles in app/dashboard-shell.css). Copy this file, dashboard-chart.tsx
 * and the CSS into the next data page; see DASHBOARD.md for the page structure.
 */

export type Tone = "green" | "amber" | "grey" | "red";

export function DashTop({ name, tagline }: { name: string; tagline: string }) {
  return (
    <header className="ds-top">
      <div className="ds-brand">{name}<small>{tagline}</small></div>
      <nav aria-label="Site">
        <a href="https://bookchaowalit.com/">Bookchaowalit</a>
      </nav>
    </header>
  );
}

export function DashFoot({ source }: { source: string }) {
  return (
    <footer className="ds-foot">
      <a href="https://bookchaowalit.com/">More projects</a>
      <a href={source}>Source</a>
      <a href="https://bookchaowalit.com/privacy">Privacy</a>
      <a href="https://monitor.bookchaowalit.com/">Status</a>
    </footer>
  );
}

export function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className="ds-pill" data-tone={tone}>{children}</span>;
}

/** The one period switch on a page. */
export function Segmented<T extends string>({ label, options, value, onChange }: { label: string; options: readonly { id: T; label: string }[]; value: T; onChange: (id: T) => void }) {
  return (
    <div className="ds-segmented" role="group" aria-label={label}>
      {options.map((option) => (
        <button key={option.id} type="button" aria-pressed={value === option.id} onClick={() => onChange(option.id)}>{option.label}</button>
      ))}
    </div>
  );
}

/** A stat tile; `tone` puts a coloured dot by the label for a value that needs a look (say why in `note`, too). */
export function Stat({ label, value, unit, note, tone }: { label: string; value: ReactNode; unit?: string; note?: ReactNode; tone?: Tone }) {
  return (
    <li className="ds-stat" data-tone={tone}>
      <span className="ds-stat-label">{tone ? <span className="ds-dot" data-tone={tone} aria-hidden="true" /> : null}{label}</span>
      <span className="ds-stat-value">{value}{unit ? <small>{unit}</small> : null}</span>
      {note ? <span className="ds-stat-note">{note}</span> : null}
    </li>
  );
}

// The chart has no state (its table switch is a native <details>), so it and its scale maths work from Server Components too.
export { ChartPanel, axisSteps, chartTop, labelRoom, linePoints, pointAt, tickAt } from "./dashboard-chart";
